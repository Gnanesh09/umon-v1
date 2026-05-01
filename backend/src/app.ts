import "express-async-errors";
import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { requestLogger } from "./middleware/requestLogger.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);
app.use(rateLimiter);
app.use("/api", apiRouter);
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});
app.use(errorHandler);