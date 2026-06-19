// consumer.js — The missing piece

import { getChannel } from '../../shared/config/rabbitmq.js';
import config from '../../shared/config/index.js';
import logger from '../../shared/config/logger.js';
import { processEvent } from './service/ProcessorService.js';

/**
 * Start consuming messages from the api_hits queue
 */
export async function startConsumer() {

    try {
        const channel = getChannel();

        if (!channel) {
            throw new Error('RabbitMQ channel not available');
        }

        const queueName = config.rabbitmq.queue;  // "api_hits"

        // Process only 1 message at a time
        // (don't overwhelm MongoDB)
        channel.prefetch(1);

        logger.info(`[Consumer] Listening on queue: ${queueName}`);

        // Start consuming messages
        channel.consume(queueName, async (msg) => {

            if (!msg) return;

            try {
                // Step 1: Parse the message
                const content = JSON.parse(msg.content.toString());

                // ✅ NEW: Validate message structure
                if (!content || !content.data) {
                    logger.error('[Consumer] Invalid message structure - missing data field', { content });
                    channel.nack(msg, false, false); // Send to DLQ
                    return;
                }

                const eventData = content.data;

                // ✅ NEW: Validate eventData has required fields
                const requiredFields = ['eventId', 'timestamp', 'serviceName', 'endpoint', 'method', 'statusCode', 'latencyMs', 'clientId', 'apiKeyId'];
                const missingFields = requiredFields.filter(field => !eventData[field]);

                if (missingFields.length > 0) {
                    logger.error('[Consumer] Invalid event - missing fields', { 
                        eventId: eventData.eventId, 
                        missingFields 
                    });
                    channel.nack(msg, false, false); // Send to DLQ
                    return;
                }

                logger.info('[Consumer] Message received', {
                    eventId: eventData.eventId,
                    type: content.type
                });

                // Step 2: Process (save to MongoDB)
                await processEvent(eventData);

                // Step 3: Acknowledge — tell RabbitMQ "done, delete this message"
                channel.ack(msg);

                logger.info('[Consumer] Message processed & acknowledged', {
                    eventId: eventData.eventId
                });

            } catch (error) {

                logger.error('[Consumer] Error processing message:', error);

                // Reject message and send to Dead Letter Queue (DLQ)
                // false = don't requeue (send to DLQ instead)
                channel.nack(msg, false, false);
            }
        });

    } catch (error) {

        logger.error('[Consumer] Failed to start consumer:', error);
        throw error;
    }
}
