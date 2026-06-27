import mongoose from 'mongoose';

/**
 * DLQ Message Schema
 * Stores failed messages that couldn't be processed
 * Allows admin to review and replay failed messages
 */
const dlqMessageSchema = new mongoose.Schema(
    {
        eventId: {
            type: String,
            required: true,
            index: true,
            unique: true  // Each failed message is unique by eventId
        },
        messageContent: {
            type: mongoose.Schema.Types.Mixed,  // Can be any JSON structure
            required: true,
        },
        failureReason: {
            type: String,
            default: 'Moved to DLQ after max retries'
        },
        attempts: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'replayed', 'deleted', 'investigated'],
            default: 'pending',
            index: true
        },
        notes: {
            type: String,
            default: ''  // Admin can add notes
        },
        lastReplayedAt: {
            type: Date,
            default: null
        },
        replayAttempts: {
            type: Number,
            default: 0
        },
        receivedAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        timestamps: true,
        collection: 'dlq_messages'
    }
);

// Indexes for common queries
dlqMessageSchema.index({ status: 1, receivedAt: -1 });
dlqMessageSchema.index({ eventId: 1, status: 1 });

const DLQMessage = mongoose.model('DLQMessage', dlqMessageSchema);

export default DLQMessage;