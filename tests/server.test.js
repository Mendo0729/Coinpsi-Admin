"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createServer } = require("../server.js");

test("servidor local: SPA, archivos, configuración y rutas protegidas", async (t) => {
  const server = createServer({ apiBaseUrl: "https://coinpsi-api.mendotech.lat/" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const base = "http://127.0.0.1:" + server.address().port;

  const index = await fetch(base + "/");
  assert.equal(index.status, 200);
  assert.match(index.headers.get("content-type"), /text\/html/);
  assert.match(await index.text(), /COINPSI/);

  const dashboard = await fetch(base + "/dashboard");
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /COINPSI/);

  const config = await fetch(base + "/runtime-config.js");
  assert.equal(config.status, 200);
  assert.match(await config.text(), /https:\/\/coinpsi-api\.mendotech\.lat/);
  assert.match(config.headers.get("cache-control"), /no-store/);

  const css = await fetch(base + "/src/index.css");
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type"), /text\/css/);

  const js = await fetch(base + "/src/main.js");
  assert.equal(js.status, 200);
  assert.match(js.headers.get("content-type"), /javascript/);

  for (const location of [
    "/package.json",
    "/server.js",
    "/.env",
    "/src/.gitkeep",
    "/src/not-found.css",
    "/src/%2e%2e/package.json"
  ]) {
    const response = await fetch(base + location);
    assert.equal(response.status, 404, location);
  }

  const head = await fetch(base + "/", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  const post = await fetch(base + "/dashboard", { method: "POST" });
  assert.equal(post.status, 405);
});
