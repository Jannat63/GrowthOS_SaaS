/**
 * Lightweight API gateway for local development — Section 6.1 / 6.5.
 * Routes requests to each backend microservice by path prefix, matching
 * the API Architecture table in Section 6.5. In production this role is
 * played by Kong Gateway (JWT validation, rate limiting, API versioning).
 */
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// This took several attempts, each verified against a real running gateway
// + service (checked auth-service's own uvicorn access log to see exactly
// what path it received — not just reasoning about the proxy config):
//   - Confirmed empirically: app.use("/api/auth", proxy) makes Express strip
//     the ENTIRE "/api/auth" mount prefix from the URL before the proxy
//     middleware runs (regardless of what the http-proxy-middleware v3 docs'
//     example implies). A request to "/api/auth/google/login" arrives at
//     the proxy as just "/google/login".
//   - Each backend service keeps ITS OWN router prefix (e.g. auth-service's
//     FastAPI router is APIRouter(prefix="/auth")), so the stripped-down
//     path needs that prefix added back, not a fixed string stripped.
// Fix: pathRewrite as a function that prepends each service's real prefix
// to whatever Express left after stripping the gateway's mount prefix.
const routes = {
  "/api/auth": { target: "http://localhost:8006", addPrefix: "/auth" },
  "/api/keywords": { target: "http://localhost:8001", addPrefix: "/keywords" },
  "/api/google-ads": { target: "http://localhost:8002", addPrefix: "/google-ads" },
  "/api/meta-ads": { target: "http://localhost:8003", addPrefix: "/meta-ads" },
  "/api/intelligence": { target: "http://localhost:8004", addPrefix: "/intelligence" },
  "/api/notify": { target: "http://localhost:8005", addPrefix: "" },
};

for (const [prefix, { target, addPrefix }] of Object.entries(routes)) {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: (path) => `${addPrefix}${path}`,
    })
  );
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway", routes: Object.keys(routes) }));

app.listen(8000, () => console.log("API Gateway running on :8000 — proxying to all services"));
