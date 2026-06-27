import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.RABBITMQ_URL;
const queue = process.env.RABBITMQ_QUEUE || 'api_hits';

async function trigger() {
    try {
        console.log("Connecting to RabbitMQ...");
        const conn = await amqp.connect(url);
        const ch = await conn.createChannel();
        
        // This message is bad because it lacks the 'data' field that the consumer expects
        const badMessage = {
            type: 'API_HIT',
            publishedAt: new Date().toISOString()
        };
        
        console.log(`Publishing invalid message directly to queue "${queue}"...`);
        ch.sendToQueue(queue, Buffer.from(JSON.stringify(badMessage)), {
            persistent: true,
            contentType: 'application/json'
        });
        
        console.log("✅ Message published! Closing connection...");
        setTimeout(() => {
            conn.close();
            process.exit(0);
        }, 1000);
    } catch (err) {
        console.error("❌ Error triggering DLQ:", err.message);
        process.exit(1);
    }
}

trigger();
