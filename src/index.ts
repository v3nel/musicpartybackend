import http from "node:http";
import { createApp } from "./app.js";
import { handleWebSocketUpgrade } from "./services/realtime.js";

const app = createApp();

const port = Number(process.env.PORT) || 3001;
const server = http.createServer(app);
server.on("upgrade", (req, socket) => {
  void handleWebSocketUpgrade(req, socket as import("node:net").Socket);
});
server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
