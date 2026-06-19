import amqp from "amqplib";
import config from "./index.js";
import logger from "./logger.js";

let connection = null;
let channel = null;

// Ye variable check karega ki
// kya already connection process chal raha hai
let isConnecting = false;

// ========================
// AUTO-RECONNECT VARIABLES
// ========================
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds
let reconnectTimeout = null;

// RabbitMQ connect function
const connectRabbitMQ = async () => {

    // Agar already channel exist karta hai
    // to wahi return krdo
    if (channel) {
        return channel;
    }

    try {

        // Connection process start
        isConnecting = true;

        logger.info("Connecting to RabbitMQ...");

        // RabbitMQ server se connection
        connection = await amqp.connect(config.rabbitmq.url);

        // Channel create karna
        channel = await connection.createChannel();

        // =========================
        // DEAD LETTER QUEUE (DLQ)
        // =========================

        // DLQ queue name
        // Example:
        // api_hits -> api_hits.dlq
        const dlqName = `${config.rabbitmq.queue}.dlq`;

        // Dead Letter Queue create karna
        await channel.assertQueue(dlqName, {
            durable: true
        });

        // =========================
        // MAIN QUEUE
        // =========================

        await channel.assertQueue(config.rabbitmq.queue, {
            durable: true,

            // Queue arguments
            arguments: {

                // Agar koi message fail ho jaye
                // to usko DLQ me bhej do
                "x-dead-letter-exchange": "",

                // Failed message kis queue me jana chahiye
                "x-dead-letter-routing-key": dlqName
            }
        });

        logger.info(
            `RabbitMQ Connected | Queue: ${config.rabbitmq.queue}`
        );

        // =========================
        // CHANNEL EVENTS (Only channel dies, connection alive)
        // =========================

        // Agar sirf channel close ho jaye
        channel.on("close", () => {

            logger.warn("[RabbitMQ] Channel closed (connection still alive), recreating channel...");

            channel = null;

            // Recreate channel without full reconnect
            scheduleChannelRecreate();
        });

        // Agar channel error aaye
        channel.on("error", (error) => {

            logger.error("[RabbitMQ] Channel error:", error);

            channel = null;

            // Recreate channel
            scheduleChannelRecreate();
        });

        // =========================
        // CONNECTION EVENTS (Entire connection dies)
        // =========================

        // Agar connection close ho jaye
        connection.on("close", () => {

            logger.warn("[RabbitMQ] Connection closed, initiating full auto-reconnect...");

            connection = null;
            channel = null;

            // Start full connection reconnect loop
            scheduleReconnect();
        });

        // Agar connection error aaye
        connection.on("error", (error) => {

            logger.error("[RabbitMQ] Connection error:", error);

            connection = null;
            channel = null;

            // Start full connection reconnect
            scheduleReconnect();
        });

        // Connection process complete
        isConnecting = false;

        return channel;

    } catch (error) {

        // Error aane pr bhi false krna important hai
        isConnecting = false;

        logger.error("RabbitMQ Connection Error:", error);

        throw error;
    }
};

// ====================================
// CHANNEL-ONLY RECREATION (Connection alive, only channel dead)
// ====================================
const scheduleChannelRecreate = async () => {

    // If channel was successfully recreated, return
    if (channel) {
        logger.info("[RabbitMQ] Channel already exists, skipping recreation");
        return;
    }

    // If connection is dead, do full reconnect instead
    if (!connection) {
        logger.warn("[RabbitMQ] Connection is also dead, doing full reconnect instead");
        scheduleReconnect();
        return;
    }

    try {

        logger.info("[RabbitMQ] Attempting to recreate channel...");

        // Create new channel on existing connection
        channel = await connection.createChannel();

        // Recreate queues
        const dlqName = `${config.rabbitmq.queue}.dlq`;

        await channel.assertQueue(dlqName, {
            durable: true
        });

        await channel.assertQueue(config.rabbitmq.queue, {
            durable: true,
            arguments: {
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": dlqName
            }
        });

        // Add channel event handlers again
        channel.on("close", () => {
            logger.warn("[RabbitMQ] Channel closed again, recreating...");
            channel = null;
            scheduleChannelRecreate();
        });

        channel.on("error", (error) => {
            logger.error("[RabbitMQ] Channel error:", error);
            channel = null;
            scheduleChannelRecreate();
        });

        logger.info("[RabbitMQ] ✅ Channel recreated successfully!");

    } catch (error) {

        logger.warn(`[RabbitMQ] Channel recreation failed: ${error.message}. Doing full reconnect...`);

        // If channel recreation fails, do full reconnect
        connection = null;
        channel = null;
        scheduleReconnect();
    }
};

// ====================================
// FULL CONNECTION RECONNECT
// ====================================
const scheduleReconnect = async () => {

    // Clear any existing reconnect timeout
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    // Check if we've exceeded max attempts
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.error(
            `[RabbitMQ] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. ` +
            `Manual server restart required to restore RabbitMQ connection.`
        );
        return;
    }

    // Increment attempt counter
    reconnectAttempts++;

    logger.info(
        `[RabbitMQ] Scheduling reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} ` +
        `in ${RECONNECT_DELAY}ms...`
    );

    // Schedule reconnect attempt after delay
    reconnectTimeout = setTimeout(async () => {

        try {

            logger.info(`[RabbitMQ] Attempting reconnection (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

            // Try to connect
            await connectRabbitMQ();

            // If successful, reset attempt counter
            reconnectAttempts = 0;
            reconnectTimeout = null;

            logger.info(
                "[RabbitMQ] ✅ Reconnected successfully! " +
                "Service is back online and ready to process hits."
            );

        } catch (error) {

            logger.warn(
                `[RabbitMQ] Reconnection attempt ${reconnectAttempts} failed: ${error.message}. ` +
                `Will retry in ${RECONNECT_DELAY}ms...`
            );

            // Schedule next retry
            scheduleReconnect();
        }
    }, RECONNECT_DELAY);
};

// Channel access karne ke liye
const getChannel = () => {
    return channel;
};

// RabbitMQ connection status check
const getRabbitMQStatus = () => {

    // Agar connection ya channel nahi hai
    if (!connection || !channel) {
        return "disconnected";
    }

    // Agar connection closing state me hai
    if (connection.connection.stream.destroyed) {
        return "closing";
    }

    return "connected";
};

// RabbitMQ close function
const closeRabbitMQ = async () => {

    try {

        // Clear any pending reconnect timeout
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }

        // Reset reconnect attempts on graceful shutdown
        reconnectAttempts = 0;

        // Channel close
        if (channel) {

            await channel.close();
            channel = null;
        }

        // Connection close
        if (connection) {

            await connection.close();
            connection = null;
        }

        logger.info("RabbitMQ connection closed successfully");

    } catch (error) {

        logger.error("Error while closing RabbitMQ:", error);
    }
};

export {
    connectRabbitMQ,
    getChannel,
    getRabbitMQStatus,
    closeRabbitMQ
};