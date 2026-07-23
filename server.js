const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const API_BASE_URL = String(
  process.env.API_BASE_URL || "http://localhost:3002"
).replace(/\/+$/, "");

app.get("/runtime-config.js", (req, res) => {
  res.type("application/javascript");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(
    `window.COINPSI_CONFIG = Object.freeze(${JSON.stringify({ API_BASE_URL })});`
  );
});

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`COINPSI Admin corriendo en el puerto ${PORT}`);
});
