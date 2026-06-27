import logger from "../../../shared/config/logger.js";

import { ingestApiHit } from "../services/ingestService.js";

export async function ingestHit(req, res) {

    try {


        // Validate req.body exists and is an object
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Request body is required and must be valid JSON',
                statusCode: 400
            });
        }

        logger.info('Ingest: Client data received', {
            clientId: req.client._id,
            clientName: req.client.name
        });

        
        const { serviceName, endpoint, method, statusCode, latencyMs } = req.body;

        const hitData = {
            serviceName,
            endpoint,
            method,
            statusCode,
            latencyMs,
            clientId: req.client._id,
            apiKeyId: req.apiKey._id,

            ip: req.ip || req.socket.remoteAddress,
            userAgent: (req.headers['user-agent'] || '').substring(0, 500) // Truncate to 500 chars
        };

        logger.info('Ingest: Hit data prepared', {
            clientId: req.client._id,
            endpoint: hitData.endpoint,
            method: hitData.method
        });

        const result = await ingestApiHit(hitData);

        if (result.status === 'rejected') {

            return res.status(503).json({
                success: false,
                message: 'Service temporarily unavailable',
                eventId: result.eventId,
                reason: result.reason,
                retryAfter: '30 seconds'
            });
        }

        return res.status(202).json({
            success: true,
            message: 'API hit queued for processing',
            data: result
        });

    }

    catch (error) {

        logger.error('Error in ingest controller', error);

        // Determine appropriate HTTP status code
        let statusCode = 400;

        // Validation errors → 422 (Unprocessable Entity)
        if (error.message.includes('Missing required fields') ||
            error.message.includes('Invalid') ||
            error.message.includes('exceeds maximum') ||
            error.message.includes('cannot be empty') ||
            error.message.includes('cannot start with') ||
            error.message.includes('can only contain') ||
            error.message.includes('must be an integer') ||
            error.message.includes('must start with')) {
            statusCode = 422;
        }

        // Use custom statusCode if provided
        if (error.statusCode) {
            statusCode = error.statusCode;
        }

        return res.status(statusCode).json({
            success: false,
            message: error.message,
            statusCode: statusCode
        });
    }
}