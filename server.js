#!/usr/bin/env node
/* The Altitude Test — zero-dependency static server + screen-sync relay.
 *
 *   npm start            → http://localhost:8080/
 *   PORT=3000 npm start  → another port
 *
 * Static files are served from this folder. Two extra routes keep every screen in sync,
 * even across separate Chrome kiosk windows or other PCs on the LAN:
 *   GET  /events   Server-Sent Events stream; every message POSTed to /bus is fanned out here.
 *   POST /bus      JSON message from a screen (see js/bus.js).
 * The last game state and leaderboard are replayed to screens that connect late. */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".mp3": "audio/mpeg",
  ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".csv": "text/csv"
};

const clients = new Set();
let lastState = null, lastLeaderboard = null;
const send = (res, msg) => res.write(`data: ${JSON.stringify(msg)}\n\n`);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/events") {
    res.writeHead(200, Object.assign({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" }, cors));
    res.write("retry: 2000\n\n");
    clients.add(res);
    if (lastState) send(res, lastState);
    if (lastLeaderboard) send(res, lastLeaderboard);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (url.pathname === "/bus") {
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    if (req.method !== "POST") { res.writeHead(405, cors); return res.end(); }
    let body = "";
    req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      try {
        const msg = JSON.parse(body);
        if (msg.type === "state") lastState = msg;
        if (msg.type === "leaderboard" && msg.rows) lastLeaderboard = msg;
        for (const c of clients) send(c, msg);
        res.writeHead(204, cors); res.end();
      } catch (e) { res.writeHead(400, cors); res.end("bad json"); }
    });
    return;
  }

  if (url.pathname === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: true, screens: clients.size })); }

  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
});

setInterval(() => { for (const c of clients) c.write(": ping\n\n"); }, 25000);

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
  console.log("The Altitude Test is boarding at:");
  console.log(`  http://localhost:${PORT}/`);
  ips.forEach(ip => console.log(`  http://${ip}:${PORT}/   (other PCs on the LAN)`));
  console.log("Screens:  /  IFE seat 1 (host)   /?seat=2  IFE seat 2   /window.html?seat=1  plane window   /leaderboard.html");
});
