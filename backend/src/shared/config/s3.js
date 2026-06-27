import { S3Client } from '@aws-sdk/client-s3';
import config from './index.js';
import logger from './logger.js';

/**
 * AWS S3 Client Configuration
 * Used for uploading analytics export files
 */
const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
    },
});

logger.info('AWS S3 client initialized', { region: config.aws.region });

export default s3Client;
