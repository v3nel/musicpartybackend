import express from "express";
import swaggerUI from "swagger-ui-express";
import { registerRoutes } from "./routes/index.js";
import { swaggerSpec } from "./swagger.config.js";

function normalizeOrigin(url: string) {
	return url.trim().replace(/\/+$/, "");
}

function getAllowedOrigins() {
	const raw =
		process.env.CORS_ALLOWED_ORIGINS ??
		process.env.FRONTEND_BASE_URL ??
		process.env.FRONTEND_URL ??
		"http://localhost:3000";

	return raw
		.split(",")
		.map(normalizeOrigin)
		.filter(Boolean);
}

export function createApp() {
	const app = express();
	const allowedOrigins = getAllowedOrigins();

	app.use((req, res, next) => {
		const requestOrigin = req.headers.origin ? normalizeOrigin(req.headers.origin) : null;
		const matchedOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : null;

		if (matchedOrigin) {
			res.header("Access-Control-Allow-Origin", matchedOrigin);
			res.header("Vary", "Origin");
		}

		if (!matchedOrigin && !requestOrigin && allowedOrigins.length > 0) {
			res.header("Access-Control-Allow-Origin", allowedOrigins[0]);
		}

		res.header("Access-Control-Allow-Credentials", "true");
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
