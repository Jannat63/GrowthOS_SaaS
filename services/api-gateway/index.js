/**
 * Lightweight API gateway for local development — Section 6.1 / 6.5.
 * Routes requests to each backend microservice by path prefix, matching
 * the API Architecture table in Section 6.5. In production this role is
 * played by Kong Gateway (JWT validation, rate limiting, API versioning).
 */
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const routes = {
  "/api/auth": "http://localhost:8006",
  "/api/keywords": "http://localhost:8001",
  "/api/google-ads": "http://localhost:8002",
  "/api/meta-ads": "http://localhost:8003",
  "/api/intelligence": "http://localhost:8004",
  "/api/notify": "http://localhost:8005",
};

for (const [prefix, target] of Object.entries(routes)) {
  app.use(prefix, createProxyMiddleware({ target, changeOrigin: true, pathRewrite: { [`^${prefix}`]: "" } }));
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway", routes: Object.keys(routes) }));

app.listen(8000, () => console.log("API Gateway running on :8000 — proxying to all services"));
