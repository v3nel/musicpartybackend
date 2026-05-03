import type { Express } from "express";
import { healthRouter } from "./health.js";
import { spotifyRouter } from "./spotify.js"

export function registerRoutes(app: Express) {
  app.use("/health", healthRouter);
  app.use("/spotify", spotifyRouter)
}
