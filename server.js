"use strict";

// Servidor local sin dependencias externas.
// En Render se distribuye dist/ directamente como sitio estático.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = __dirname;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf"
};

function respond(res, status, message, method) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(method === "HEAD" ? undefined : message);
}

async function sendFile(res, pathname, method) {
  const absolutePath = path.resolve(ROOT, "." + pathname);
  if (absolutePath !== path.join(ROOT, "index.html") &&
      !absolutePath.startsWith(ROOT + path.sep)) {
    respond(res, 404, "No encontrado", method);
    return;
  }

  try {
    // Evitar que un enlace simbólico permita leer archivos externos al proyecto.
    const resolvedPath = await fs.realpath(absolutePath);
    if (!resolvedPath.startsWith(ROOT + path.sep)) {
      respond(res, 404, "No encontrado", method);
      return;
    }

    const data = await fs.readFile(resolvedPath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(resolvedPath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache"
    });
    res.end(method === "HEAD" ? undefined : data);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR" || error.code === "EACCES") {
      respond(res, 404, "No encontrado", method);
      return;
    }

    console.error("Error sirviendo archivo estático:", error);
    respond(res, 500, "Error interno", method);
  }
}

function createServer({ apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3002" } = {}) {
  const apiUrl = String(apiBaseUrl).trim().replace(/\/+$/, "");

  return http.createServer(async (req, res) => {
    const method = req.method;
    if (method !== "GET" && method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      respond(res, 405, "Método no permitido", method);
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      respond(res, 400, "Solicitud inválida", method);
      return;
    }

    if (pathname === "/runtime-config.js") {
      res.writeHead(200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff"
      });
      const config = "window.COINPSI_CONFIG = Object.freeze(" +
        JSON.stringify({ API_BASE_URL: apiUrl }) + ");";
      res.end(method === "HEAD" ? undefined : config);
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      await sendFile(res, "/index.html", method);
      return;
    }

    const segments = pathname.split("/").slice(1);
    // El navegador solo necesita servir los recursos públicos de src/ y public/.
    if (segments[0] === "src" || segments[0] === "public") {
      if (pathname.includes("\\") || pathname.includes("\0") ||
          segments.some((segment) => !segment || segment.startsWith("."))) {
        respond(res, 404, "No encontrado", method);
        return;
      }
      await sendFile(res, pathname, method);
      return;
    }

    // Las rutas internas del panel se resuelven en el router del navegador.
    if (!pathname.includes("\\") && !pathname.includes("\0") &&
        !segments.some((segment) => segment.startsWith(".")) &&
        !path.posix.extname(pathname)) {
      await sendFile(res, "/index.html", method);
      return;
    }

    respond(res, 404, "No encontrado", method);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3001);
  createServer().listen(port, "0.0.0.0", () => {
    console.log("COINPSI Admin corriendo en el puerto " + port);
  });
}

module.exports = { createServer };
