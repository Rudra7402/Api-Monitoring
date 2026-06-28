import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import logger from './shared/config/logger.js';

import { connectDB, disconnectDB } from './shared/config/mongodb.js';
//import { connectPostgres, closePG } from './shared/config/postgres.js';
import { connectRabbitMQ, closeRabbitMQ } from './shared/config/rabbitmq.js';

import config from './shared/config/index.js';

import authRouter from './services/auth/routes/authRouter.js';
import ingestRouter from './services/ingest/routes/ingestRoutes.js';
import analyticsRouter from "./services/analytics/routes/analyticsRoutes.js";
import clientRouter from './services/client/routes/clientRoutes.js';
import dlqRouter from './services/processor/routes/dlqRoutes.js';

import cookieParser from 'cookie-parser';

import { startConsumer } from './services/processor/consumer.js';
import { getMetrics, initializeMetrics } from './services/processor/service/metrics.js';
import { startDLQConsumer } from './services/processor/dlqConsumer.js';

import authenticateMiddleware from './shared/middlewares/authenticateMiddleware.js';
import authoriseMiddleware from './shared/middlewares/authoriseMiddleware.js';
/**
 * Create Express application
 * This app object is the main backend server
 */
const app = express();



/**
 * -------------------------
 * MIDDLEWARES
 * -------------------------
 */


/**
 * Helmet middleware
 * Adds security-related HTTP headers
 */
app.use(helmet());


/**
 * CORS middleware
 * Allows frontend running on localhost:5173
 * to access this backend server
 * 
 * credentials:true allows cookies/auth data
 */
// app.use(cors({
//     origin: function (origin, callback) {
//         if (!origin) return callback(null, true);

//         const allowedFrontend = process.env.FRONTEND_URL;

//         if (
//             origin.startsWith('http://localhost:') ||
//             origin.startsWith('http://127.0.0.1:') ||
//             origin === 'https://api-monitoring-silk.vercel.app/api' ||
//             (allowedFrontend && origin === allowedFrontend)
//         ) {
//             return callback(null, true);
//         }

//         callback(new Error('Not allowed by CORS'));
//     },
//     credentials: true
// }));

app.use(cors({
    origin: true,
    credentials: true
}));



/**
 * Parses incoming JSON request body
 * Converts raw JSON into JavaScript object
 * and stores it inside req.body
 */
app.use(express.json());
app.use(cookieParser());



/**
 * -------------------------
 * REQUEST LOGGER MIDDLEWARE
 * -------------------------
 * 
 * Logs:
 * - HTTP method
 * - Request path
 * - Client IP
 * - Browser/device info
 */

app.use((req, res, next) => {

    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    /**
     * Pass control to next middleware/route
     */
    next();

});



/**
 * -------------------------
 * HEALTH CHECK ROUTE
 * -------------------------
 * 
 * Used to check whether server is running properly
 */

app.get('/health', (req, res) => {

    res.status(200).json({
        success: true,
        message: 'Service is healthy',
        status: 'healthy',

        /**
         * Current server timestamp
         */
        timestamp: new Date().toISOString(),

        /**
         * How long the Node.js process
         * has been running (in seconds)
         */
        uptime: process.uptime()
    });

});



/**
 * -------------------------
 * ROOT ROUTE
 * -------------------------
 * 
 * Displays API information
 */

app.get("/", (req, res) => {

    res.status(200).json({
        success: true,
        message: 'API Hit Monitoring Service',

        service: 'API Hit Monitoring System',

        version: '1.0.0',

        /**
         * Available API endpoints
         */
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            ingest: '/api/hit',
            analytics: '/api/analytics',
        }
    });

});


/**
 * API Routes
 */
app.use("/api/auth", authRouter);
app.use("/api/hit", ingestRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/dlq", dlqRouter);
app.use("/api", clientRouter);


/**
 * -------------------------
 * PROCESSOR METRICS
 * -------------------------
 * 
 * Shows:
 * - Total events processed
 * - Total failures
 * - Error rate
 * - Messages per minute
 */

app.get('/api/processor/metrics', authenticateMiddleware, authoriseMiddleware(['super_admin']), (req, res) => {

    try {
        const metrics = getMetrics();

        res.status(200).json({
            success: true,
            message: 'Processor metrics retrieved',
            data: metrics,
            statusCode: 200
        });
    } catch (error) {
        logger.error('Error fetching metrics:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            statusCode: 500
        });
    }
});

/**
 * -------------------------
 * 404 ROUTE HANDLER
 * -------------------------
 * 
 * Executes when no route matches
 */

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "Endpoint not found",
        statusCode: 404
    });

});





/**
 * -------------------------
 * INITIALIZE CONNECTIONS
 * -------------------------
 * 
 * Connects all external services:
 * - MongoDB
 * - PostgreSQL
 * - RabbitMQ
 */

async function initializeConnection() {
    try {
        await connectDB();

        // Load existing metric counts from MongoDB
        await initializeMetrics();

        await connectRabbitMQ();

        // Retry consumer 3 times with delays
        let consumerStarted = false;
        for (let i = 0; i < 3; i++) {
            try {
                await startConsumer();
                await startDLQConsumer();
                consumerStarted = true;
                break;
            } catch (err) {
                logger.warn(`[Retry ${i + 1}/3] Consumer start failed:`, err.message);
                if (i < 2) await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (!consumerStarted) {
            throw new Error('Consumer failed to start after 3 retries');
        }

        logger.info("All connections established successfully");
    }
    catch (error) {
        logger.error("Failed to initialize connections:", error);
        throw error;
    }
}




/**
 * -------------------------
 * START SERVER
 * -------------------------
 * 
 * 1. Initialize all connections
 * 2. Start Express server
 * 3. Setup graceful shutdown handlers
 */

async function startServer() {

    try {

        /**
         * Connect databases/message queue first
         */
        await initializeConnection();


        /**
         * Start HTTP server
         */
        const server = app.listen(config.port, () => {

            logger.info(`Server started on port ${config.port}`);

            logger.info(`Environment: ${config.node_env}`);

            logger.info(`API available at: http://localhost:${config.port}`);

        });



        /**
         * -------------------------
         * GRACEFUL SHUTDOWN
         * -------------------------
         * 
         * Safely closes:
         * - HTTP server
         * - MongoDB connection
         * - PostgreSQL connection
         * - RabbitMQ connection
         */

        const gracefulShutdown = async (signal) => {

            logger.info(`${signal} received, shutting down gracefully...`);


            /**
             * Stop accepting new requests
             * but allow already-running requests
             * to complete first
             */
            server.close(async () => {

                logger.info("HTTP server closed");

                try {

                    /**
                     * Close MongoDB connection
                     */
                    await disconnectDB();




                    /**
                     * Close RabbitMQ connection
                     */
                    await closeRabbitMQ();


                    logger.info('All connections closed, exiting process');


                    /**
                     * Exit process successfully
                     */
                    process.exit(0);

                }
                catch (error) {

                    logger.error('Error during shutdown:', error);


                    /**
                     * Exit process with error code
                     */
                    process.exit(1);
                }
            });


            /**
             * Force shutdown after 10 seconds
             * if graceful shutdown gets stuck
             */
            setTimeout(() => {

                logger.error("Forced shutdown");

                process.exit(1);

            }, 10000);

        };



        /**
         * SIGTERM
         * 
         * Usually sent by:
         * - Docker
         * - Kubernetes
         * - Cloud platforms
         */
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));



        /**
         * SIGINT
         * 
         * Usually triggered by:
         * Ctrl + C
         */
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    }
    catch (error) {

        logger.error('Failed to start server:', error);

        process.exit(1);
    }
}



/**
 * Start the application
 */
startServer().catch((error) => {
    logger.error('Fatal server startup error:', error);
    process.exit(1);
});