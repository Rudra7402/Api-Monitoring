import logger from '../../../shared/config/logger.js';
import * as analyticsService from '../services/analyticsService.js';

/**
 * Analytics Controller
 * Handles HTTP requests for analytics endpoints
 * Validates query parameters and calls service layer
 * 
 * Service functions no longer take mongoCollection parameter
 */

/**
 * GET /api/analytics/dashboard
 * Returns overall dashboard statistics
 * Query params: startTime (required), endTime (required)
 */
export const getDashboard = async (req, res) => {
    try {
        // Extract client ID from authenticated request
        const clientId = req.client._id;
        const { startTime, endTime } = req.query;

        // Validate required parameters
        if (!startTime || !endTime) {
            logger.warn('Dashboard request missing date range', { clientId });
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required',
                statusCode: 400
            });
        }

        // Validate date format
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use ISO 8601 format',
                statusCode: 400
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'startTime cannot be after endTime',
                statusCode: 400
            });
        }

        logger.info('Fetching dashboard metrics', { clientId, startTime, endTime });

        // Call service - no mongoCollection parameter needed
        const stats = await analyticsService.getDashboardStats(clientId, start, end);

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Dashboard metrics retrieved successfully',
            data: stats,
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getDashboard:', error);

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/analytics/top-endpoints
 * Returns top endpoints by request count
 * Query params: startTime (required), endTime (required), limit (optional, default: 10)
 */
export const getTopEndpoints = async (req, res, next) => {
    try {
        const clientId = req.client._id;
        const { startTime, endTime, limit = 10 } = req.query;

        // Validate required parameters
        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required',
                statusCode: 400
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use ISO 8601 format',
                statusCode: 400
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'startTime cannot be after endTime',
                statusCode: 400
            });
        }

        // Validate and sanitize limit
        const parsedLimit = parseInt(limit, 10);
        const sanitizedLimit = Number.isNaN(parsedLimit) ? 10 : Math.min(Math.max(1, parsedLimit), 100);

        logger.info('Fetching top endpoints', { clientId, limit: sanitizedLimit });

        // Call service - no mongoCollection parameter needed
        const endpoints = await analyticsService.getTopEndpoints(
            clientId,
            start,
            end,
            sanitizedLimit
        );

        return res.status(200).json({
            success: true,
            message: 'Top endpoints retrieved successfully',
            data: endpoints,
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getTopEndpoints:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/analytics/status-distribution
 * Returns distribution of HTTP status codes
 * Query params: startTime (required), endTime (required)
 */
export const getStatusDistribution = async (req, res, next) => {
    try {
        const clientId = req.client._id;
        const { startTime, endTime } = req.query;

        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required',
                statusCode: 400
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format',
                statusCode: 400
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'startTime cannot be after endTime',
                statusCode: 400
            });
        }

        logger.info('Fetching status code distribution', { clientId });

        // Call service - no mongoCollection parameter needed
        const distribution = await analyticsService.getStatusCodeDistribution(
            clientId,
            start,
            end
        );

        return res.status(200).json({
            success: true,
            message: 'Status distribution retrieved successfully',
            data: distribution,
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getStatusDistribution:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/analytics/response-time-distribution
 * Returns response time distribution in buckets
 * Query params: startTime (required), endTime (required)
 */
export const getResponseTimeDistribution = async (req, res, next) => {
    try {
        const clientId = req.client._id;
        const { startTime, endTime } = req.query;

        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required',
                statusCode: 400
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format',
                statusCode: 400
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'startTime cannot be after endTime',
                statusCode: 400
            });
        }

        logger.info('Fetching response time distribution', { clientId });

        // Call service - no mongoCollection parameter needed
        const distribution = await analyticsService.getResponseTimeDistribution(
            clientId,
            start,
            end
        );

        return res.status(200).json({
            success: true,
            message: 'Response time distribution retrieved successfully',
            data: distribution,
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getResponseTimeDistribution:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/analytics/service-breakdown
 * Returns breakdown by service
 * Query params: startTime (required), endTime (required)
 */
export const getServiceBreakdown = async (req, res, next) => {
    try {
        const clientId = req.client._id;
        const { startTime, endTime } = req.query;

        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required',
                statusCode: 400
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format',
                statusCode: 400
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'startTime cannot be after endTime',
                statusCode: 400
            });
        }

        logger.info('Fetching service breakdown', { clientId });

        // Call service - no mongoCollection parameter needed
        const breakdown = await analyticsService.getServiceBreakdown(
            clientId,
            start,
            end
        );

        return res.status(200).json({
            success: true,
            message: 'Service breakdown retrieved successfully',
            data: breakdown,
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getServiceBreakdown:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};