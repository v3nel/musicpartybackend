import express from "express";
import swaggerUI from "swagger-ui-express";
import { registerRoutes } from "./routes/index.js";
import { swaggerSpec } from "./swagger.config.js";

export function createApp() {
	const app = express();

	app.use((req, res, next) => {
		const origin = process.env.FRONTEND_URL ?? "http://localhost:3000";
		res.header("Access-Control-Allow-Origin", origin);
		res.header("Vary", "Origin");
		res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token");
		res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
		if (req.method === "OPTIONS") {
			return res.sendStatus(204);
		}
		next();
	});

	app.use(express.json());

	registerRoutes(app);

	if (process.env.NODE_ENV === "DEV") {
		app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
	}

	return app;
}
