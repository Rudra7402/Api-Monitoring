import winston from "winston";
import config from "./index.js";

/**
 * Winston Logger Setup
 *
 * Winston is a professional logging library for Node.js.
 * It is used instead of console.log() in production-level applications
 * because it provides:
 * - log levels
 * - timestamps
 * - structured logging
 * - file logging
 * - better debugging and monitoring
 */

/**
 * Main Logger Object
 *
 * createLogger() creates the main logger configuration.
 * Here we define:
 * - minimum log level
 * - log format
 * - metadata
 * - transports (where logs should go)
 */
const logger = winston.createLogger({

    /**
     * LOG LEVEL
     *
     * Development:
     * level = "debug"
     * -> shows all logs including detailed debug logs
     *
     * Production:
     * level = "info"
     * -> hides debug logs and only shows important logs
     *
     * Log hierarchy:
     * error > warn > info > debug
     */

    level: config.node_env === "production"
        ? "info"
        : "debug",

    /**
     * FORMAT SECTION
     *
     * combine() merges multiple formatting options together.
     */

    format: winston.format.combine(

        /**
         * Adds timestamp to every log
         *
         * Example:
         * 2026-05-27 14:20:11
         */

        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss"
        }),

        /**
         * Saves complete error stack trace
         *
         * Useful for debugging production crashes
         */

        winston.format.errors({
            stack: true
        }),

        /**
         * Enables string interpolation
         *
         * Example:
         * logger.info("User %s logged in", username)
         */

        winston.format.splat(),

        /**
         * Converts logs into structured JSON format
         *
         * Useful for:
         * - production logging
         * - monitoring systems
         * - log analysis tools
         */

        winston.format.json()
    ),

    /**
     * Metadata automatically added in every log
     */

    defaultMeta: {
        service: "api-monitoring"
    },

    /**
     * TRANSPORTS
     *
     * Transports define where logs should go.
     */

    transports: [

        /**
         * ERROR LOG FILE
         *
         * Stores only error logs
         */

        new winston.transports.File({
            filename: "logs/error.log",
            level: "error"
        }),

        /**
         * COMBINED LOG FILE
         *
         * Stores all logs:
         * info, warn, error, debug
         */

        new winston.transports.File({
            filename: "logs/combined.log"
        }),
    ],
});

/**
 * DEVELOPMENT CONSOLE LOGGING
 *
 * In development mode:
 * - logs appear in console
 * - colorful readable output
 * - easier debugging
 *
 * In production:
 * - console logging disabled
 * - logs only saved in files
 * - cleaner and optimized logging
 */

if (config.node_env !== "production") {

    logger.add(

        new winston.transports.Console({

            format: winston.format.combine(

                /**
                 * Adds colors in console logs
                 */

                winston.format.colorize(),

                /**
                 * Simple readable console format
                 *
                 * Example:
                 * info: Server started
                 */

                winston.format.simple()
            )
        })
    );
}

/**
 * Export logger so it can be used anywhere
 *
 * Example:
 * logger.info("Server started");
 * logger.error("Database failed");
 */

export default logger;


/* ============================================================
   COMPLETE SUMMARY
===============================================================

1. Winston is a professional logging library used instead of
   console.log() for production-ready backend applications.

2. createLogger() creates the main logger configuration.

3. Log Levels:
   - error -> serious issues
   - warn  -> warnings
   - info  -> normal important logs
   - debug -> detailed developer logs

4. Development Mode:
   - level = debug
   - logs shown in console
   - logs saved in files
   - detailed debugging enabled

5. Production Mode:
   - level = info
   - debug logs hidden
   - console logging disabled
   - logs only stored in files

6. Formats:
   - timestamp -> adds time
   - errors -> saves stack trace
   - splat -> enables interpolation
   - json -> structured logging

7. Transports define where logs go:
   - Console
   - error.log
   - combined.log

8. error.log stores only error logs.

9. combined.log stores all logs.

10. logger.add() dynamically adds extra transports
    (console transport in development mode).

11. Winston improves:
    - debugging
    - monitoring
    - observability
    - production error tracking

12. Used in this API Monitoring project for:
    - tracking API/server activity
    - debugging failures
    - monitoring backend issues
    - storing structured logs
============================================================ */