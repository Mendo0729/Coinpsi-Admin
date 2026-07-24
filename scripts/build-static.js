const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "dist");
const excludedEntries = new Set([
  ".git",
  ".github",
  "node_modules",
  "dist",
  "scripts",
  "server.js",
  "package.json",
  "package-lock.json",
  ".gitignore",
  "README.md"
]);

function shouldExclude(name) {
  return excludedEntries.has(name) || name.startsWith(".env");
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
  if (shouldExclude(entry.name)) continue;

  fs.cpSync(
    path.join(projectRoot, entry.name),
    path.join(outputDirectory, entry.name),
    { recursive: true }
  );
}

const apiBaseUrl = String(
  process.env.API_BASE_URL || "https://coinpsi-api.mendotech.lat"
).trim().replace(/\/+$/, "");

if (!/^https?:\/\//i.test(apiBaseUrl)) {
  throw new Error("API_BASE_URL debe comenzar con http:// o https://");
}

const runtimeConfig = `window.COINPSI_CONFIG = Object.freeze(${JSON.stringify(
  { API_BASE_URL: apiBaseUrl },
  null,
  2
)});\n`;

fs.writeFileSync(
  path.join(outputDirectory, "runtime-config.js"),
  runtimeConfig,
  "utf8"
);

console.log(`Static build generado en ${outputDirectory}`);
console.log(`API_BASE_URL=${apiBaseUrl}`);
