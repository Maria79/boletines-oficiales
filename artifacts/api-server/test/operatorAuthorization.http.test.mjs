import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const localHost = "127.0.0.1";
const fakeDatabaseUrl = "postgresql://unused:unused@127.0.0.1:65439/unused";
const validTestToken = "only-for-http-tests-never-use-in-production-2026";

const guardedEndpoints = [
  ["GET", "/api/clients"],
  ["GET", "/api/clients/1"],
  ["POST", "/api/clients"],
  ["PATCH", "/api/clients/1"],
  ["DELETE", "/api/clients/1"],
  ["GET", "/api/entries/1/notes"],
  ["POST", "/api/entries/1/notes"],
  ["PATCH", "/api/entries/1/notes/2"],
  ["DELETE", "/api/entries/1/notes/2"],
  ["GET", "/api/alerts"],
  ["GET", "/api/alerts/matches"],
  ["POST", "/api/alerts"],
  ["DELETE", "/api/alerts/1"],
  ["PATCH", "/api/entries/1/read"],
  ["PATCH", "/api/entries/1/bookmark"],
  ["GET", "/api/sync/status"],
  ["POST", "/api/sync"],
];

async function findFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, localHost, resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function withRealApi(token, fn) {
  const port = await findFreePort();
  const base = `http://${localHost}:${port}`;
  const env = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: fakeDatabaseUrl,
    PORT: String(port),
  };
  if (token === undefined) delete env.BOLETINES_CLIENT_API_TOKEN;
  else env.BOLETINES_CLIENT_API_TOKEN = token;

  // Smoke-test the actual production bundle and actual mounted Express routes.
  // Every protected request must be rejected BEFORE any DB access.
  const child = spawn(process.execPath, ["dist/index.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", chunk => { output = (output + String(chunk)).slice(-3000); });
  }

  try {
    let started = false;
    for (let attempt = 0; attempt < 75; attempt++) {
      if (child.exitCode !== null) break;
      try {
        const check = await fetch(`${base}/api/healthz`, {
          signal: AbortSignal.timeout(400),
        });
        if (check.status === 200) {
          started = true;
          break;
        }
      } catch { /* Child may still be booting */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(started, `API startup failed or healthz unavailable: ${output}`);
    await fn(base);
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([
        new Promise(resolve => child.once("exit", resolve)),
        new Promise(resolve => setTimeout(resolve, 1500)),
      ]);
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  }
}

test("without configuration, all sensitive API routes fail closed (HTTP 503)", async () => {
  await withRealApi(undefined, async base => {
    for (const [method, path] of guardedEndpoints) {
      const res = await fetch(base + path, {
        method,
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(2000),
      });
      assert.equal(res.status, 503, `${method} ${path} should fail closed`);
    }
    // A public health check remains usable without credentials.
    const health = await fetch(base + "/api/healthz");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });
  });
});

test("with configuration, all sensitive API routes deny missing and invalid tokens", async () => {
  await withRealApi(validTestToken, async base => {
    for (const [method, path] of guardedEndpoints) {
      for (const auth of [undefined, "Bearer invalid-client-token"]) {
        const res = await fetch(base + path, {
          method,
          headers: {
            "content-type": "application/json",
            ...(auth ? { authorization: auth } : {}),
          },
          signal: AbortSignal.timeout(2000),
        });
        assert.equal(res.status, 401, `${method} ${path}: ${auth ? "bad" : "missing"} token`);
        const responseText = await res.text();
        assert.ok(!responseText.includes(validTestToken), "Response must not leak secret");
      }
    }
  });
});
