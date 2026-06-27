import mongoose from 'mongoose';

/**
 * AnalyticsExport Schema
 * 
 * Saves a record every time an admin exports analytics data to S3.
 * Why? Because pre-signed URLs expire in 1 hour.
 * By saving the S3 file key (fileName), we can generate a fresh URL anytime.
 */
const analyticsExportSchema = new mongoose.Schema(
    {
        // Which client's data was exported
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true
        },

        // S3 file path — used to regenerate pre-signed URL later
        // Example: "analytics-exports/abc123/export-2026-06-22T10-30-00.csv"
        s3Key: {
            type: String,
            required: true
        },

        // Date range of exported data
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },

        // How many API hit records were exported
        totalRecords: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true,          // auto adds createdAt, updatedAt
        collection: 'analytics_exports'
    }
);

const AnalyticsExport = mongoose.model('AnalyticsExport', analyticsExportSchema);

export default AnalyticsExport;
