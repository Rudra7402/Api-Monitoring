import logger from "../config/logger.js";
import { getClientByApiKey } from "../../services/client/service/clientService.js";

/**
 * Validate API key middleware
 * Checks if API key is valid and attaches client info to request
 * 
 * Usage:
 * router.post('/ingest', validateApiKey, controller);           // For ingest
 * router.get('/analytics', validateApiKey, controller);         // For analytics
 * 
 * The permission check adapts based on the route
 */

export const validateApiKey = async (req, res, next) => {
    try {
        // 1. Get API key from headers
        const apiKey = req.headers["x-api-key"];

        // 2. Check if API key exists
        if (!apiKey) {
            logger.warn("API key missing", {
                path: req.path,
                ip: req.ip,
            });

            return res.status(401).json({
                success: false,
                message: 'API key is required',
                statusCode: 401
            });
        }

        // 3. Look up API key in database
        const result = await getClientByApiKey(apiKey);

        if (!result) {
            logger.warn("Invalid API key", {
                path: req.path,
                ip: req.ip,
            });

            return res.status(403).json({
                success: false,
                message: 'Invalid API key',
                statusCode: 403
            });
        }

        const { client, apiKey: apiKeyData } = result;

        // 4. Check if client is active
        if (!client.isActive) {
            logger.warn('[ValidateApiKey] Inactive client', {
                clientId: apiKeyData.clientId,
                ip: req.ip
            });


            return res.status(403).json({
                success: false,
                message: 'Client account is inactive',
                statusCode: 403
            });
        }

        // In validateApiKey middleware - check if key expired
        if (apiKeyData.expiresAt && new Date() > new Date(apiKeyData.expiresAt)) {
            return res.status(403).json({
                success: false,
                message: 'API key has expired',
                statusCode: 403
            });
        }


        // 5. Check API key permissions based on route/endpoint
        // Different routes need different permissions
        const fullPath = req.originalUrl || req.path;
        if (req.baseUrl.includes('/analytics') || fullPath.includes('/analytics')) {
            // Analytics endpoints require canReadAnalytics permission
            if (!apiKeyData.permissions?.canReadAnalytics) {
                logger.warn('API key without analytics permission attempted access', {
                    path: fullPath,
                    ip: req.ip,
                    apiKeyId: apiKeyData._id,
                });

                return res.status(403).json({
                    success: false,
                    message: "API key does not have analytics read permissions",
                    statusCode: 403
                });
            }
        } else {
            // Ingest endpoints require canIngest permission
            if (!apiKeyData.permissions?.canIngest) {
                logger.warn('API key without ingest permission attempted access', {
                    path: fullPath,
                    ip: req.ip,
                    apiKeyId: apiKeyData._id,
                });

                return res.status(403).json({
                    success: false,
                    message: "API key does not have ingest permissions",
                    statusCode: 403
                });
            }
        }

        // 6. Attach client and API key to request
        req.client = client;
        req.apiKey = apiKeyData;

        logger.debug('API key validated successfully', {
            clientId: client._id,
            clientName: client.name,
            apiKeyId: apiKeyData._id,
            path: req.path
        });

        next();

    } catch (error) {
        logger.error('[ValidateApiKey] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            statusCode: 500
        });
    }
};

export default validateApiKey;