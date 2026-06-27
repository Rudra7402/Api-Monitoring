import express from 'express';
import * as dlqController from '../controller/dlqController.js';
import authenticateMiddleware from '../../../shared/middlewares/authenticateMiddleware.js';
import authoriseMiddleware from '../../../shared/middlewares/authoriseMiddleware.js';
import { APPLICATION_ROLES } from '../../../shared/constants/role.js';

const router = express.Router();

/**
 * All DLQ routes are admin-only
 * Requires valid JWT token with ADMIN role
 */
router.use(authenticateMiddleware);
router.use(authoriseMiddleware([APPLICATION_ROLES.SUPER_ADMIN]));

/**
 * GET /api/dlq/stats
 * Get DLQ statistics (total failed messages, by status)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     total: 5,
 *     pending: 3,
 *     replayed: 1,
 *     deleted: 1,
 *     investigated: 0
 *   }
 * }
 */
router.get('/stats', dlqController.getDLQStats);

/**
 * GET /api/dlq/messages
 * Get all DLQ messages with pagination
 * 
 * Query parameters:
 * - status: 'pending' | 'replayed' | 'deleted' | 'investigated' (optional)
 * - limit: number (default: 20)
 * - skip: number (default: 0)
 * 
 * Example:
 * GET /api/dlq/messages?status=pending&limit=10&skip=0
 */
router.get('/messages', dlqController.getDLQMessages);

/**
 * GET /api/dlq/messages/:messageId
 * Get single DLQ message details
 * 
 * Example:
 * GET /api/dlq/messages/507f1f77bcf86cd799439011
 */
router.get('/messages/:messageId', dlqController.getDLQMessage);

/**
 * POST /api/dlq/messages/:messageId/replay
 * Replay a failed message back to the main api_hits queue
 * 
 * Example:
 * POST /api/dlq/messages/507f1f77bcf86cd799439011/replay
 */
router.post('/messages/:messageId/replay', dlqController.replayDLQMessage);

/**
 * PUT /api/dlq/messages/:messageId
 * Update DLQ message (status and notes)
 * 
 * Body:
 * {
 *   status: 'investigated',
 *   notes: 'Found malformed data in endpoint field'
 * }
 */
router.put('/messages/:messageId', dlqController.updateDLQMessage);

/**
 * DELETE /api/dlq/messages/:messageId
 * Delete a DLQ message permanently
 * 
 * Example:
 * DELETE /api/dlq/messages/507f1f77bcf86cd799439011
 */
router.delete('/messages/:messageId', dlqController.deleteDLQMessage);

export default router;