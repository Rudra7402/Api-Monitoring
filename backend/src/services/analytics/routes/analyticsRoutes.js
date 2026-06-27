import express from 'express';
import * as analyticsController from '../controller/analyticsController.js';
import { validateApiKey } from '../../../shared/middlewares/validateApiKey.js';
import authenticate from '../../../shared/middlewares/authenticateMiddleware.js';
import authorise from '../../../shared/middlewares/authoriseMiddleware.js';
import { APPLICATION_ROLES } from '../../../shared/constants/role.js';

/**
 * Analytics Routes
 * All analytics endpoints are protected by API key validation middleware
 * 
 * MongoDB collection injection removed - now handled directly in service layer
 */

const router = express.Router();

/**
 * POST /api/analytics/export
 * Export routes are defined BEFORE the global validateApiKey middleware
 * because they use JWT authentication (super_admin only), not API keys
 */
router.post(
    '/export',
    authenticate,
    authorise([APPLICATION_ROLES.SUPER_ADMIN]),
    analyticsController.exportAnalytics
);

/**
 * GET /api/analytics/exports/:exportId/url
 * Regenerate pre-signed URL for an existing export (JWT protected)
 */
router.get(
    '/exports/:exportId/url',
    authenticate,
    authorise([APPLICATION_ROLES.SUPER_ADMIN]),
    analyticsController.getExportDownloadUrl
);

/**
 * GET /api/analytics/exports
 * Retrieve all historical exports (JWT protected)
 */
router.get(
    '/exports',
    authenticate,
    authorise([APPLICATION_ROLES.SUPER_ADMIN]),
    analyticsController.getAllExports
);


/**
 * Apply API key validation to all remaining analytics routes
 */
router.use(validateApiKey);

/**
 * GET /api/analytics/dashboard
 * Get overall dashboard statistics
 * 
 * Query Parameters:
 * - startTime (required): ISO 8601 date string (e.g., 2024-01-01T00:00:00Z)
 * - endTime (required): ISO 8601 date string (e.g., 2024-01-31T23:59:59Z)
 * 
 * Example Request:
 * GET /api/analytics/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Dashboard metrics retrieved successfully",
 *   data: {
 *     totalRequests: 1000,
 *     successfulRequests: 950,
 *     errorRequests: 50,
 *     successRate: 95.00,
 *     errorRate: 5.00,
 *     avgResponseTime: 125.50,
 *     minResponseTime: 10,
 *     maxResponseTime: 5000,
 *     p95ResponseTime: 450
 *   },
 *   statusCode: 200
 * }
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * GET /api/analytics/top-endpoints
 * Get top endpoints by request count
 * 
 * Query Parameters:
 * - startTime (required): ISO 8601 date string
 * - endTime (required): ISO 8601 date string
 * - limit (optional): Number of top endpoints (default: 10, max: 100)
 * 
 * Example Request:
 * GET /api/analytics/top-endpoints?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z&limit=10
 */
router.get('/top-endpoints', analyticsController.getTopEndpoints);

/**
 * GET /api/analytics/status-distribution
 * Get HTTP status code distribution
 * 
 * Query Parameters:
 * - startTime (required): ISO 8601 date string
 * - endTime (required): ISO 8601 date string
 * 
 * Example Request:
 * GET /api/analytics/status-distribution?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
 */
router.get('/status-distribution', analyticsController.getStatusDistribution);



/**
 * GET /api/analytics/response-time-distribution
 * Get response time distribution in buckets
 * 
 * Query Parameters:
 * - startTime (required): ISO 8601 date string
 * - endTime (required): ISO 8601 date string
 * 
 * Example Request:
 * GET /api/analytics/response-time-distribution?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Response time distribution retrieved successfully",
 *   data: [
 *     { 
 *       category: "fast (0-100ms)", 
 *       count: 400 
 *     },
 *     { 
 *       category: "normal (100-500ms)", 
 *       count: 450 
 *     },
 *     { 
 *       category: "slow (500-1000ms)", 
 *       count: 120 
 *     },
 *     { 
 *       category: "very slow (>1000ms)", 
 *       count: 30 
 *     }
 *   ],
 *   statusCode: 200
 * }
 */
router.get('/response-time-distribution', analyticsController.getResponseTimeDistribution);



/**
 * GET /api/analytics/service-breakdown
 * Get breakdown of metrics by service
 * 
 * Query Parameters:
 * - startTime (required): ISO 8601 date string
 * - endTime (required): ISO 8601 date string
 * 
 * Example Request:
 * GET /api/analytics/service-breakdown?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
 */
router.get('/service-breakdown', analyticsController.getServiceBreakdown);

/**
 * GET /api/analytics/error-rate-trend
 * Get daily error rate progression
 * 
 * Query Parameters:
 * - startTime (required): ISO 8601 date string
 * - endTime (required): ISO 8601 date string
 * 
 * Example Request:
 * GET /api/analytics/error-rate-trend?startTime=2024-06-20T00:00:00Z&endTime=2024-06-22T23:59:59Z
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Error rate trend retrieved successfully",
 *   data: [
 *     { 
 *       date: "2024-06-20", 
 *       totalRequests: 5000, 
 *       errorCount: 100, 
 *       errorRate: 2.0 
 *     },
 *     { 
 *       date: "2024-06-21", 
 *       totalRequests: 4500, 
 *       errorCount: 315, 
 *       errorRate: 7.0 
 *     },
 *     { 
 *       date: "2024-06-22", 
 *       totalRequests: 4200, 
 *       errorCount: 630, 
 *       errorRate: 15.0 
 *     }
 *   ],
 *   statusCode: 200
 * }
 */
router.get('/error-rate-trend', analyticsController.getErrorRateTrend);

/**
 * GET /api/analytics/slowest-endpoints
 * Get endpoints sorted by average response time (slowest first)
 * Shows performance bottlenecks
 * 
 * Query Parameters:
 * - startTime (required): ISO 8601 date string
 * - endTime (required): ISO 8601 date string
 * - limit (optional): Number of slowest endpoints (default: 10, max: 100)
 * 
 * Example Request:
 * GET /api/analytics/slowest-endpoints?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z&limit=10
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Slowest endpoints retrieved successfully",
 *   data: [
 *     { 
 *       endpoint: "/send-email", 
 *       method: "POST", 
 *       avgLatency: 1200, 
 *       minLatency: 850, 
 *       maxLatency: 2100, 
 *       totalRequests: 450, 
 *       errorRate: 2.2 
 *     },
 *     { 
 *       endpoint: "/generate-report", 
 *       method: "POST", 
 *       avgLatency: 900, 
 *       minLatency: 500, 
 *       maxLatency: 1600, 
 *       totalRequests: 280, 
 *       errorRate: 1.8 
 *     }
 *   ],
 *   statusCode: 200
 * }
 */
router.get('/slowest-endpoints', analyticsController.getSlowestEndpoints);

export default router;