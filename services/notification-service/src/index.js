/**
 * Real-time alert dispatch — Section 6.1 / 6.3 (Notification Service).
 * Pushes live alerts for ranking changes, budget pacing, creative fatigue, etc.
 * to connected dashboard clients over WebSocket.
 */
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("subscribe", (workspaceId) => socket.join(workspaceId));
});

// Internal endpoint other services call to push an alert
app.post("/dispatch", (req, res) => {
  const { workspaceId, type, message } = req.body;
  io.to(workspaceId).emit("alert", { type, message, timestamp: new Date().toISOString() });
  // TODO: also send email via SendGrid / Slack webhook depending on alert severity
  res.json({ dispatched: true });
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "notification-service" }));

httpServer.listen(8005, () => console.log("Notification service running on :8005"));
