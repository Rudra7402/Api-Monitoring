import mongoose from "mongoose";
import config from "./index.js";
import logger from "./logger.js";


export const connectDB = async () => {
    try {
        // Connect to Mongo using details from our config index.js
        await mongoose.connect(config.mongo.uri, {
            dbName: config.mongo.dbName,
        });

        logger.info(`MongoDB connected successfully: ${config.mongo.uri}`);
    } catch (error) {
        logger.error("Failed to connect to MongoDB:", error);
        process.exit(1); // Shut down the server if we can't connect to the database
    }
};


export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        logger.info("MongoDB disconnected successfully!");
    } catch (error) {
        logger.error("Failed to disconnect from MongoDB:", error);
    }
};



/**
 * ============================================================
 * CONNECTION EVENT LISTENERS
 * ============================================================
 *
 * These listeners run continuously in the background
 * and monitor MongoDB connection state.
 *
 * IMPORTANT:
 *
 * These are NOT mainly for initial connection creation.
 *
 * connectDB() catch block handles:
 * -> first-time connection errors
 *
 * Event listeners mainly handle:
 * -> runtime connection issues
 *
 * Example:
 * MongoDB was connected successfully,
 * but later:
 * - network issue happened
 * - MongoDB crashed
 * - internet disconnected
 * ============================================================
 */



/**
 * ============================================================
 * ERROR EVENT
 * ============================================================
 *
 * "error" is a predefined Mongoose connection event.
 *
 * This event means:
 * -> some problem/error occurred in the connection
 *
 * IMPORTANT:
 * connection may STILL exist.
 *
 * Examples:
 * - timeout
 * - temporary network issue
 * - query issue
 * - Mongo response issue
 *
 * Analogy:
 * "Phone call me disturbance aa rahi"
 * ============================================================
 */

mongoose.connection.on("error", (err) => {

    logger.error(
        "MongoDB connection error occurred:",
        err
    );
});



/**
 * ============================================================
 * DISCONNECTED EVENT
 * ============================================================
 *
 * "disconnected" is also a predefined Mongoose event.
 *
 * This event means:
 * -> MongoDB connection completely broke/stopped
 *
 * Examples:
 * - MongoDB server shutdown
 * - internet completely gone
 * - Atlas disconnected
 *
 * Analogy:
 * "Phone call completely cut gayi"
 *
 * IMPORTANT DIFFERENCE:
 *
 * error:
 * -> something went wrong
 * -> connection may still exist
 *
 * disconnected:
 * -> connection fully lost
 * ============================================================
 */

mongoose.connection.on("disconnected", () => {

    logger.warn(
        "MongoDB connection was disconnected!"
    );
});