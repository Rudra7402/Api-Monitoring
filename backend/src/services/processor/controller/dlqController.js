import DLQMessage from '../../../shared/models/DLQMessage.js';
import logger from '../../../shared/config/logger.js';
import { publishApiHit } from '../../../shared/events/producer/eventProducer.js';
import config from '../../../shared/config/index.js';

/**
 * GET /api/dlq/stats
 * Get DLQ statistics (total, pending, replayed, etc.)
 */
export const getDLQStats = async (req, res) => {
    try {
        const total = await DLQMessage.countDocuments();
        const pending = await DLQMessage.countDocuments({ status: 'pending' });
        const replayed = await DLQMessage.countDocuments({ status: 'replayed' });
        const deleted = await DLQMessage.countDocuments({ status: 'deleted' });
        const investigated = await DLQMessage.countDocuments({ status: 'investigated' });

        logger.info('[DLQ Controller] Retrieved DLQ stats');

        return res.status(200).json({
            success: true,
            message: 'DLQ stats retrieved successfully',
            data: {
                total,
                pending,
                replayed,
                deleted,
                investigated
            },
            statusCode: 200
        });

    } catch (error) {
        logger.error('[DLQ Controller] Error fetching DLQ stats:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            statusCode: 500
        });
    }
};

/**
 * GET /api/dlq/messages
 * Get all DLQ messages with pagination and filtering
 * Query: status, limit (default 20), skip (default 0)
 */
export const getDLQMessages = async (req, res) => {
    try {
        const { status, limit = 20, skip = 0 } = req.query;

        const filters = status ? { status } : {};

        const messages = await DLQMessage
            .find(filters)
            .sort({ receivedAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();

        const total = await DLQMessage.countDocuments(filters);

        logger.info('[DLQ Controller] Retrieved DLQ messages', { count: messages.length });

        return res.status(200).json({
            success: true,
            message: 'DLQ messages retrieved successfully',
            data: messages,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: skip + messages.length < total
            },
            statusCode: 200
        });

    } catch (error) {
        logger.error('[DLQ Controller] Error fetching DLQ messages:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            statusCode: 500
        });
    }
};

/**
 * GET /api/dlq/messages/:messageId
 * Get single DLQ message details
 */
export const getDLQMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await DLQMessage.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'DLQ message not found',
                statusCode: 404
            });
        }

        logger.info('[DLQ Controller] Retrieved DLQ message', { messageId });

        return res.status(200).json({
            success: true,
            message: 'DLQ message retrieved successfully',
            data: message,
            statusCode: 200
        });

    } catch (error) {
        logger.error('[DLQ Controller] Error fetching DLQ message:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            statusCode: 500
        });
    }
};

/**
 * POST /api/dlq/messages/:messageId/replay
 * Replay a failed message back to the main queue
 */
export const replayDLQMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await DLQMessage.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'DLQ message not found',
                statusCode: 404
            });
        }

        // Republish to RabbitMQ queue
        const isPublished = await publishApiHit(message.messageContent.data, config.rabbitmq.queue);

        if (!isPublished) {
            return res.status(503).json({
                success: false,
                message: 'Failed to replay message: queue producer is unavailable (Circuit Breaker is OPEN)',
                statusCode: 503
            });
        }

        // Update message status ONLY on success
        message.status = 'replayed';
        message.lastReplayedAt = new Date();
        message.replayAttempts += 1;
        await message.save();

        logger.info('[DLQ Controller] Replayed DLQ message', {
            messageId,
            eventId: message.eventId
        });

        return res.status(200).json({
            success: true,
            message: 'Message replayed successfully and sent back to queue',
            data: message,
            statusCode: 200
        });

    } catch (error) {
        logger.error('[DLQ Controller] Error replaying DLQ message:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            statusCode: 500
        });
    }
};

/**
 * PUT /api/dlq/messages/:messageId
 * Update DLQ message status and notes
 * Body: { status: 'pending'|'replayed'|'deleted'|'investigated', notes: '...' }
 */
export const updateDLQMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { status, notes } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (notes) updateData.notes = notes;

        const message = await DLQMessage.findByIdAndUpdate(
            messageId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'DLQ message not found',
                statusCode: 404
            });
        }

        logger.info('[DLQ Controller] Updated DLQ message', { messageId, status });

        return res.status(200).json({
            success: true,
            message: 'DLQ message updated successfully',
            data: message,
            statusCode: 200
        });

    } catch (error) {
        logger.error('[DLQ Controller] Error updating DLQ message:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            statusCode: 500
        });
    }
};

/**
 * DELETE /api/dlq/messages/:messageId
 * Delete a DLQ message permanently
 */
export const deleteDLQMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await DLQMessage.findByIdAndDelete(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'DLQ message not found',
                statusCode: 404
            });
        }

        logger.info('[DLQ Controller] Deleted DLQ message', { messageId });

        return res.status(200).json({
            success: true,
            message: 'DLQ message deleted successfully',
            statusCode: 200
        });

    } catch (error) {
        logger.error('[DLQ Controller] Error deleting DLQ message:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            statusCode: 500
        });
    }
};