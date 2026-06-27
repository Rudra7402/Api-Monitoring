import logger from '../../../shared/config/logger.js';
import * as analyticsService from '../services/analyticsService.js';
import * as exportService from '../services/exportService.js';

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
export const getTopEndpoints = async (req, res) => {
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
export const getStatusDistribution = async (req, res) => {
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
export const getResponseTimeDistribution = async (req, res) => {
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
export const getServiceBreakdown = async (req, res) => {
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

/**
 * GET /api/analytics/error-rate-trend
 * Returns daily error rate progression
 * Query params: startTime (required), endTime (required)
 */
export const getErrorRateTrend = async (req, res) => {
    try {
        const clientId = req.client._id;
        const { startTime, endTime } = req.query;

        // Validate required parameters
        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required',
                statusCode: 400
            });
        }

        // Parse and validate dates
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

        logger.info('Fetching error rate trend', { clientId, startTime, endTime });

        // Call service to get error rate trend
        const trend = await analyticsService.getErrorRateTrend(clientId, start, end);

        return res.status(200).json({
            success: true,
            message: 'Error rate trend retrieved successfully',
            data: trend,
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getErrorRateTrend:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET /api/analytics/slowest-endpoints
 * Returns endpoints sorted by average response time (slowest first)
 * Query params: startTime (required), endTime (required), limit (optional, default: 10, max: 100)
 */
export const getSlowestEndpoints = async (req, res) => {
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

        // Parse and validate dates
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

        logger.info('Fetching slowest endpoints', { clientId, limit: sanitizedLimit });

        // Call service to get slowest endpoints
        const endpoints = await analyticsService.getSlowestEndpoints(
            clientId,
            start,
            end,
            sanitizedLimit
        );

        return res.status(200).json({
            success: true,
            message: 'Slowest endpoints retrieved successfully',
            data: endpoints,
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getSlowestEndpoints:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * POST /api/analytics/export
 * Exports all API hits for a client in a date range as CSV to AWS S3
 * Returns a pre-signed download URL (valid for 1 hour)
 * Body params: clientId (required), startTime (required), endTime (required)
 */
export const exportAnalytics = async (req, res) => {
    try {
        const { clientId, startTime, endTime } = req.body;

        // Validate clientId
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'clientId is required',
                statusCode: 400
            });
        }

        // Validate required parameters
        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required',
                statusCode: 400
            });
        }

        // Parse and validate dates
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

        logger.info('Analytics export requested', { clientId, startTime, endTime });

        // Call export service — fetches data, converts to CSV, uploads to S3
        const result = await exportService.exportAnalyticsToS3(clientId, start, end);

        // No data found case
        if (result.totalRecords === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data found for the given date range',
                statusCode: 404
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Analytics exported successfully',
            data: {
                exportId: result.exportId,       // save this to regenerate URL later
                downloadUrl: result.url,
                fileName: result.fileName,
                totalRecords: result.totalRecords,
                expiresIn: result.expiresIn
            },
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in exportAnalytics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to export analytics data',
            statusCode: 500
        });
    }
};

/**
 * GET /api/analytics/exports/:exportId/url
 * Generate a fresh pre-signed download URL for an existing export
 * Used when the original URL has expired (after 1 hour)
 */
export const getExportDownloadUrl = async (req, res) => {
    try {
        const { exportId } = req.params;

        if (!exportId) {
            return res.status(400).json({
                success: false,
                message: 'exportId is required',
                statusCode: 400
            });
        }

        logger.info('Fresh download URL requested', { exportId });

        const result = await exportService.getSignedDownloadUrl(exportId);

        return res.status(200).json({
            success: true,
            message: 'Download URL generated successfully',
            data: {
                downloadUrl: result.url,
                expiresIn: result.expiresIn
            },
            statusCode: 200
        });

    } catch (error) {
        logger.error('Error in getExportDownloadUrl:', error);

        // If export record not found
        if (error.message === 'Export record not found') {
            return res.status(404).json({
                success: false,
                message: 'Export record not found',
                statusCode: 404
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to generate download URL',
            statusCode: 500
        });
    }
};

/**
 * GET /api/analytics/exports
 * Retrieves all historical analytics exports from MongoDB (Super Admin Only)
 */
export const getAllExports = async (req, res) => {
    try {
        const exports = await exportService.listAllExports();
        return res.status(200).json({
            success: true,
            message: 'All exports retrieved successfully',
            data: exports,
            statusCode: 200
        });
    } catch (error) {
        logger.error('Error in getAllExports:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve exports list',
            statusCode: 500
        });
    }
};
