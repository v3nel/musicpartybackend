import express from "express";
import { registerRoutes } from "./routes/index.js";

const app = express();

app.use(express.json());

registerRoutes(app);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
