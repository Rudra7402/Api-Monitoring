import { getChannel } from "../../shared/config/rabbitmq.js";
import config from "../../shared/config/index.js";
import logger from "../../shared/config/logger.js";
import DLQMessage from "../../shared/models/DLQMessage.js";

export async function startDLQConsumer() {
    try {

        const channel = getChannel();
        const dlqName = `${config.rabbitmq.queue}.dlq`;

        channel.prefetch(1);
        logger.info(`[DLQ Consumer] Listening on: ${dlqName}`);

        channel.consume(dlqName, async (msg) => {

            if (!msg) return;

            try {
                const content = JSON.parse(msg.content.toString());
                const attempts = msg.properties?.headers?.['x-death']?.length || 0;

                logger.error('[DLQ] Message from dead letter queue', {
                    eventId: content.data?.eventId,
                    attempts,
                    reason: 'Max retries exceeded'
                });


                await DLQMessage.create({
                    eventId: content.data?.eventId || `dlq-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    messageContent: content,
                    attempts,
                    receivedAt: new Date()
                });

                channel.ack(msg);
            }
            catch (error) {
                logger.error('[DLQ] Error processing DLQ message:', error);
                channel.nack(msg, false, false);
            }
        }, { noAck: false });
    }
    catch (error) {
        logger.error('[DLQ] Failed to start DLQ consumer:', error);
        throw error;
    }
}