import express from "express";
import rateLimit from "express-rate-limit";

import config from "../../../shared/config/index.js";
import { validateApiKey } from "../../../shared/middlewares/validateApiKey.js";
import { ingestHit } from "../controller/ingestController.js";

const ingestRouter = express.Router();


// Limit request body size to prevent DoS
ingestRouter.use(express.json({ limit: '1MB' }));


const ingestLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,

    message: {
        success: false,
        message: "Too many requests, please try again later",
        statusCode: 429
    }
});

ingestRouter.post("/", validateApiKey, ingestLimiter, ingestHit);

// Health check endpoint (no auth required)
ingestRouter.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Ingest service is healthy",
        timestamp: new Date().toISOString(),
        service: "ingest"
    });
});

export default ingestRouter;