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

import cookieParser from 'cookie-parser';

import { startConsumer } from './services/processor/consumer.js';





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
app.use(cors({
    origin: 'http://localhost:5173',
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
app.use("/api", clientRouter);

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

        logger.info("Initializing database connections...");


        /**
         * Connect MongoDB
         */
        await connectDB();


        // /**
        //  * Connect PostgreSQL
        //  */
        // await connectPostgres();


        /**
         * Connect RabbitMQ
         */
        await connectRabbitMQ();

        await startConsumer();

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
startServer();