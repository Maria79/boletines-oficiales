import { test } from "node:test";
import assert from "node:assert/strict";
import { checkClientApiToken, requireClientApiToken } from "./clientApiAccess.ts";

const TOKEN = "test-only-secret-with-at-least-32-chars";
const bearer = (token) => `Bearer ${token}`;

test("client API fails closed without a valid server-side secret", () => {
  assert.equal(checkClientApiToken(bearer(TOKEN), undefined), "unconfigured");
  assert.equal(checkClientApiToken(bearer(TOKEN), ""), "unconfigured");
  assert.equal(checkClientApiToken(bearer(TOKEN), "short"), "unconfigured");
  assert.equal(checkClientApiToken(bearer(TOKEN), TOKEN + " "), "unconfigured");
});

test("requires an exact Bearer token", () => {
  assert.equal(checkClientApiToken(undefined, TOKEN), "missing");
  assert.equal(checkClientApiToken("", TOKEN), "missing");
  assert.equal(checkClientApiToken("Basic xxx", TOKEN), "missing");
  assert.equal(checkClientApiToken("Bearer ", TOKEN), "invalid");
  assert.equal(checkClientApiToken(bearer("incorrect-token-with-at-least-32-chars"), TOKEN), "invalid");
  assert.equal(checkClientApiToken(bearer(TOKEN + "x"), TOKEN), "invalid");
  assert.equal(checkClientApiToken(bearer(TOKEN), TOKEN), "authorized");
});

function invokeMiddleware(providedHeader, serverToken) {
  const previous = process.env.BOLETINES_CLIENT_API_TOKEN;
  try {
    if (serverToken === undefined) delete process.env.BOLETINES_CLIENT_API_TOKEN;
    else process.env.BOLETINES_CLIENT_API_TOKEN = serverToken;

    let nextCalled = false;
    const response = { statusCode: 200, payload: null };
    const res = {
      status(code) { response.statusCode = code; return this; },
      json(payload) { response.payload = payload; return this; },
    };
    const req = { header(name) {
      assert.equal(name, "authorization");
      return providedHeader;
    }};
    requireClientApiToken(req, res, () => { nextCalled = true; });
    return { ...response, nextCalled };
  } finally {
    if (previous === undefined) delete process.env.BOLETINES_CLIENT_API_TOKEN;
    else process.env.BOLETINES_CLIENT_API_TOKEN = previous;
  }
}

test("middleware denies access before reaching data handlers", () => {
  const unconfigured = invokeMiddleware(bearer(TOKEN), undefined);
  assert.equal(unconfigured.statusCode, 503);
  assert.equal(unconfigured.nextCalled, false);

  const missing = invokeMiddleware(undefined, TOKEN);
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.nextCalled, false);

  const invalid = invokeMiddleware(bearer("wrong-token"), TOKEN);
  assert.equal(invalid.statusCode, 401);
  assert.equal(invalid.nextCalled, false);
  assert.doesNotMatch(JSON.stringify(invalid.payload), /wrong-token/);
});

test("middleware permits exactly the configured token", () => {
  const allowed = invokeMiddleware(bearer(TOKEN), TOKEN);
  assert.equal(allowed.statusCode, 200);
  assert.equal(allowed.nextCalled, true);
});
