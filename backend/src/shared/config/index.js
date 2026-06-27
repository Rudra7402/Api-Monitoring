// Global level configuration settings for the application

import dotenv from "dotenv"

dotenv.config()


const config = {
    // Server
    node_env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || "5000", 10),

    // MOngodb
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/api_monitoring',
        dbName: process.env.MONGO_DB_NAME || 'api_monitoring',
    },


    // RabbitMQ
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
        queue: process.env.RABBITMQ_QUEUE || 'api_hits',   //name of queue
    },

    jwt: {
        secret: process.env.JWT_SECRET || "change_me_in_production",
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // Rate Limit
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10), // 1000 req / 15 min per IP
    },

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expiresIn: 24 * 60 * 60 * 1000
    },

    // AWS S3
    aws: {
        region: process.env.AWS_REGION || 'ap-south-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        bucketName: process.env.AWS_S3_BUCKET_NAME || '',
    }
}

export default config;