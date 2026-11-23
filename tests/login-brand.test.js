"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const login = fs.readFileSync(path.join(root, "src/pages/login.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/styles/brand.css"), "utf8");
const responsive = fs.readFileSync(path.join(root, "src/styles/responsive.css"), "utf8");

test("el panel izquierdo muestra solamente el logotipo y COINPSI", () => {
  const brandContent = login.match(/<div class="login-brand-content">([\s\S]*?)<\/div>\s*<\/section>/)?.[1];
  assert.ok(brandContent, "Debe existir el bloque de marca del login");
  assert.match(brandContent, /coinpsi-symbol\.svg/);
  assert.match(brandContent, /<strong>COINPSI<\/strong>/);
  assert.doesNotMatch(brandContent, /Gestión institucional|Administra el contenido|login-feature-list|landing institucional|Corporación de Investigaciones Psicológicas/);
  assert.match(styles, /\.login-brand-content\s*\{[^}]*justify-content:\s*center;/);
});

test("se mantiene el formulario y el logotipo móvil", () => {
  assert.match(login, /id="login-form"/);
  assert.match(login, /id="login-username"/);
  assert.match(login, /id="login-password"/);
  assert.match(login, /id="login-submit"/);
  assert.match(login, /class="login-mobile-brand"/);
  assert.match(responsive, /\.login-brand-panel\s*\{\s*display:\s*none;/);
});
