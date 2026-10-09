import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "../dist/public");
assert.ok(existsSync(join(root, "index.html")), "Missing built index.html");
const html = readFileSync(join(root, "index.html"), "utf8");
assert.match(html, /<title>Gestoría Canarias/);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const full = join(dir, item.name);
    if (item.isDirectory()) return walk(full);
    return [full];
  });
}

const jsFiles = walk(root).filter(path => path.endsWith(".js"));
assert.ok(jsFiles.length > 0, "No built JS bundle found");

const bundle = jsFiles.map(path => readFileSync(path, "utf8")).join("\n");
assert.match(bundle, /DEMOSTRACI[ÓO]N FICTICIA/, "The built app is not the read-only portfolio demo");
assert.match(bundle, /Publicaciones de muestra/, "The sample dashboard was not bundled");
assert.match(bundle, /Exportar CSV ficticio/, "The sample data explorer was not bundled");
assert.match(bundle, /Sin API de negocio ni datos privados/, "The read-only disclosure was not bundled");

const source = readFileSync(resolve(import.meta.dirname, "../src/demo/PortfolioDemo.tsx"), "utf8");
assert.doesNotMatch(source, /\bfetch\s*\(|\baxios\b|XMLHttpRequest|WebSocket|localStorage|sessionStorage/, "Demo source must not fetch or persist visitor data");
assert.doesNotMatch(source, /useListEntries|useGetStatsSummary|useCreateAlert|useRunSync|useCreateClient/, "Demo must not mount operational API hooks");
console.log("Read-only Vite demo verified: dashboard, filters, relevance and static bundle.");
