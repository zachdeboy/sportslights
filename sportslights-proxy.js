#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║          SportsLights — Local Hue Proxy Server          ║
 * ║                                                          ║
 * ║  Runs on YOUR computer. Bridges the SportsLights web    ║
 * ║  app (on Vercel) to your Philips Hue bridge on your     ║
 * ║  local network (192.168.68.50).                         ║
 * ║                                                          ║
 * ║  HOW TO RUN:                                             ║
 * ║    node sportslights-proxy.js                            ║
 * ║                                                          ║
 * ║  Requires: Node.js 18+ (no npm install needed!)         ║
 * ╚══════════════════════════════════════════════════════════╝
 */

"use strict";

// ─── CONFIG ──────────────────────────────────────────────
const PORT = 3001;
const HUE_BRIDGE_IP = process.env.HUE_BRIDGE_IP || "192.168.68.50";
const HUE_BRIDGE_URL = `http://${HUE_BRIDGE_IP}`;
// ─────────────────────────────────────────────────────────

// Built-in Node.js modules only — no npm install required
const http = require("http");
const https = require("https");
const { URL } = require("url");

// ANSI colors for terminal output
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(tag, msg, color = C.gray) {
  const ts = new Date().toLocaleTimeString();
  console.log(`${C.gray}[${ts}]${C.reset} ${color}${C.bold}${tag}${C.reset} ${msg}`);
}

// ─── REQUEST HANDLER ─────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS headers — allow requests from any origin (Vercel app, localhost dev)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  // ── Health check ──────────────────────────────────────
  if (path === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, bridge: HUE_BRIDGE_IP, ts: Date.now() }));
    return;
  }

  // ── Status page ───────────────────────────────────────
  if (path === "/" || path === "/status") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html>
<html>
<head><title>SportsLights Proxy</title>
<style>
  body { font-family: monospace; background: #070a0f; color: #f0f4f8; padding: 40px; }
  h1 { color: #CE1141; } code { background: #1a1a2e; padding: 2px 8px; border-radius: 4px; }
  .ok { color: #4ade80; } .info { color: #8899aa; }
</style>
</head>
<body>
<h1>💡 SportsLights Proxy</h1>
<p class="ok">✓ Running on port ${PORT}</p>
<p class="info">Hue Bridge: <code>${HUE_BRIDGE_IP}</code></p>
<p class="info">Routes all <code>/hue/*</code> requests to <code>http://${HUE_BRIDGE_IP}/*</code></p>
<br>
<p class="info">Quick links:</p>
<ul>
<li><a href="/ping" style="color:#FA4616">/ping</a> — health check</li>
<li>/hue/api/[YOUR-KEY]/lights — list lights</li>
<li>/hue/api/[YOUR-KEY]/groups — list rooms/groups</li>
</ul>
</body>
</html>`);
    return;
  }

  // ── Hue proxy ─────────────────────────────────────────
  if (path.startsWith("/hue")) {
    const huePath = path.replace(/^\/hue/, "") || "/";
    const targetUrl = `${HUE_BRIDGE_URL}${huePath}`;

    log("HUE →", `${req.method} ${huePath}`, C.blue);

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const options = {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body || ""),
        },
      };

      const proxyReq = http.request(targetUrl, options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => { data += chunk; });
        proxyRes.on("end", () => {
          log("HUE ←", `${proxyRes.statusCode} (${data.length} bytes)`, C.green);
          res.writeHead(proxyRes.statusCode || 200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(data);
        });
      });

      proxyReq.on("error", (err) => {
        log("ERROR", `Cannot reach Hue bridge at ${HUE_BRIDGE_IP}: ${err.message}`, C.red);
        res.writeHead(502, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({
          error: "Cannot reach Hue bridge",
          bridge: HUE_BRIDGE_IP,
          message: err.message,
          hint: `Make sure you're on your home network and the bridge is at ${HUE_BRIDGE_IP}`,
        }));
      });

      if (body) proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // ── 404 ───────────────────────────────────────────────
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found", path }));
});

// ─── STARTUP ─────────────────────────────────────────────
server.listen(PORT, "localhost", () => {
  console.log(`
${C.red}${C.bold}╔══════════════════════════════════════════════════╗
║          💡 SportsLights Proxy Running           ║
╚══════════════════════════════════════════════════╝${C.reset}

${C.green}✓${C.reset} Proxy listening on    ${C.cyan}http://localhost:${PORT}${C.reset}
${C.green}✓${C.reset} Hue bridge target     ${C.cyan}http://${HUE_BRIDGE_IP}${C.reset}

${C.yellow}Quick start:${C.reset}
  1. Open your SportsLights dashboard (Vercel URL)
  2. Enter your Hue API key in Settings
  3. Hit "Test Connections" to verify
  4. Press Start Watching!

${C.gray}Tip: Keep this terminal open while watching games.${C.reset}
${C.gray}Press Ctrl+C to stop.${C.reset}
`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`${C.red}✗ Port ${PORT} is already in use.${C.reset}`);
    console.error(`  Either another proxy is running (that's fine! use it)`);
    console.error(`  or kill the process: lsof -ti:${PORT} | xargs kill`);
  } else {
    console.error(`${C.red}Server error:${C.reset}`, err);
  }
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log(`\n${C.yellow}Shutting down SportsLights proxy. Enjoy the game! 🎉${C.reset}\n`);
  process.exit(0);
});
