import express from "express";
import { getHealthStatus } from "../services/healthService.js";

export const healthRouter = express.Router();

healthRouter.get("/", (_req, res) => {
  res.json(getHealthStatus());
});
