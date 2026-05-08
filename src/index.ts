import express from "express";
import { registerRoutes } from "./routes/index.js";
import swaggerUI from 'swagger-ui-express'
import { swaggerSpec } from "./swagger.config.js"

const app = express();

app.use(express.json());

registerRoutes(app);

if(process.env.NODE_ENV === "DEV"){
  app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec))
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
