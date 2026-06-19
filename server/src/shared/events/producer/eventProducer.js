import logger from '../../config/logger.js';

import {
    allowRequest,
    recordSuccess,
    recordFailure
} from './CircuitBreaker.js';

import { getChannel } from '../../config/rabbitmq.js';

/**
 * Publish API hit to RabbitMQ queue
 */
export async function publishApiHit(eventData, queueName) {

    // Circuit breaker check

    if (!allowRequest()) {

        logger.warn(
            '[Producer] Circuit breaker OPEN - request rejected'
        );

        return false;
    }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        try {

            const channel = await getChannel();

            if (!channel) {
                throw new Error("RabbitMQ channel is not available yet");
            }

            const message = {
                type: 'API_HIT',
                data: eventData,
                publishedAt: new Date().toISOString()
            };

            const buffer =
                Buffer.from(JSON.stringify(message));

            // Send message to queue


            // ARCHITECTURE NOTE:
            // We are using a standard channel here (Fire-and-Forget) rather than a ConfirmChannel.
            // Trade-off: This maximizes throughput and lowers latency for our API request flow.
            // Risk: If the RabbitMQ node crashes after the TCP connection is established but 
            // before writing to disk, this specific message might be lost in transit.
            // Since this is for API Monitoring/Logging, dropping 0.001% of logs in a 
            // catastrophe is an acceptable business trade-off to keep the API fast.

            channel.sendToQueue(queueName, buffer, {
                persistent: true,
                contentType: 'application/json'
            });

            // Reset failures on success

            recordSuccess();

            logger.info(
                `[Producer] Message published successfully on attempt ${attempt}`
            );

            return true;

        } catch (error) {



            logger.error(
                `[Producer] Publish failed on attempt ${attempt}`,
                error.message
            );

            // Last attempt failed

            if (attempt === maxAttempts) {

                // Record failure

                recordFailure();

                logger.error(
                    '[Producer] Failed after maximum retry attempts'
                );

                return false;
            }

            // Wait before retry

            await new Promise((resolve) =>
                setTimeout(resolve, 1000)
            );
        }
    }
}
