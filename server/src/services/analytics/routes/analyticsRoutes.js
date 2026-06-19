import express from 'express';
import * as analyticsController from '../controller/analyticsController.js';
import { validateApiKey } from '../../../shared/middlewares/validateApiKey.js';

/**
 * Analytics Routes
 * All analytics endpoints are protected by API key validation middleware
 * 
 * MongoDB collection injection removed - now handled directly in service layer
 */

const router = express.Router();

/**
 * Apply API key validation to all analytics routes
 * Validates that the API key exists and is active
 * Middleware from: server/src/shared/middlewares/validateApiKey.js
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

export default router;