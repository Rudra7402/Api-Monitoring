import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../../../shared/config/s3.js';
import config from '../../../shared/config/index.js';
import ApiHit from '../../../shared/models/ApiHits.js';
import AnalyticsExport from '../../../shared/models/AnalyticsExport.js';
import mongoose from 'mongoose';
import logger from '../../../shared/config/logger.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';


/**
 * Converts an array of API hit objects to CSV string format
 * @param {Array} hits - Array of API hit documents
 * @returns {string} - CSV formatted string
 */
const convertToCSV = (hits) => {
    // CSV Header row
    const headers = [
        'Timestamp',
        'Endpoint',
        'Method',
        'Status Code',
        'Latency (ms)',
        'Service Name',
        'Client ID'
    ];

    // CSV Data rows
    const rows = hits.map(hit => [
        new Date(hit.timestamp).toISOString(),
        hit.endpoint || '',
        hit.method || '',
        hit.statusCode || '',
        hit.latencyMs || '',
        hit.serviceName || '',
        hit.clientId?.toString() || ''
    ]);

    // Combine header + rows into CSV string
    const csvLines = [headers, ...rows].map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    );

    return csvLines.join('\n');
};

/**
 * Fetches all API hits for a client in a date range and exports to S3 as CSV
 * 
 * @param {string} clientId - Client ID
 * @param {Date} startTime - Start date
 * @param {Date} endTime - End date
 * @returns {Promise<{url: string, fileName: string, totalRecords: number}>}
 */
export const exportAnalyticsToS3 = async (clientId, startTime, endTime) => {
    try {
        logger.info('Starting analytics export', { clientId, startTime, endTime });

        // Step 1: Fetch all raw API hits from MongoDB for this client
        const hits = await ApiHit.find({
            clientId: new mongoose.Types.ObjectId(clientId),
            timestamp: {
                $gte: new Date(startTime),
                $lte: new Date(endTime)
            }
        })
            .sort({ timestamp: -1 })
            .lean(); // lean() returns plain JS objects, faster than Mongoose documents

        logger.info(`Fetched ${hits.length} records for export`, { clientId });

        if (hits.length === 0) {
            logger.warn('No data found for export', { clientId, startTime, endTime });
            return { url: null, fileName: null, totalRecords: 0 };
        }

        // Step 2: Convert to CSV format
        const csvContent = convertToCSV(hits);
        const csvBuffer = Buffer.from(csvContent, 'utf-8');

        // Step 3: Create a unique file name using timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `analytics-exports/${clientId}/export-${timestamp}.csv`;

        // Step 4: Upload CSV to AWS S3
        const uploadCommand = new PutObjectCommand({
            Bucket: config.aws.bucketName,
            Key: fileName,
            Body: csvBuffer,
            ContentType: 'text/csv',
            Metadata: {
                clientId: clientId.toString(),
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalRecords: hits.length.toString()
            }
        });

        await s3Client.send(uploadCommand);
        logger.info('CSV uploaded to S3 successfully', { fileName });

        // Step 5: Save export record to MongoDB
        // This allows us to regenerate the pre-signed URL later (after it expires)
        const exportRecord = await AnalyticsExport.create({
            clientId,
            s3Key: fileName,
            startTime,
            endTime,
            totalRecords: hits.length
        });

        logger.info('Export record saved to MongoDB', { exportId: exportRecord._id });

        // Step 6: Generate a pre-signed download URL (valid for 1 hour)
        const getCommand = new GetObjectCommand({
            Bucket: config.aws.bucketName,
            Key: fileName,
        });

        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

        logger.info('Pre-signed URL generated', { fileName, expiresIn: '1 hour' });

        return {
            exportId: exportRecord._id,   // so admin can use this to regenerate URL later
            url: signedUrl,
            fileName,
            totalRecords: hits.length,
            expiresIn: '1 hour'
        };

    } catch (error) {
        logger.error('Error exporting analytics to S3:', error);
        throw error;
    }
};

/**
 * Generates a fresh pre-signed download URL for an existing export
 * Used when the original URL has expired
 * 
 * @param {string} exportId - MongoDB _id of the export record
 * @returns {Promise<{url: string, expiresIn: string}>}
 */
export const getSignedDownloadUrl = async (exportId) => {
    try {
        // Find the export record in MongoDB
        const exportRecord = await AnalyticsExport.findById(exportId);

        if (!exportRecord) {
            throw new Error('Export record not found');
        }

        // Use the saved S3 key to generate a fresh pre-signed URL
        const getCommand = new GetObjectCommand({
            Bucket: config.aws.bucketName,
            Key: exportRecord.s3Key,
        });

        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

        logger.info('Fresh pre-signed URL generated', { exportId, s3Key: exportRecord.s3Key });

        return {
            url: signedUrl,
            expiresIn: '1 hour'
        };

    } catch (error) {
        logger.error('Error generating signed URL:', error);
        throw error;
    }
};

/**
 * Retrieves all export records from MongoDB sorted by creation date descending
 * @returns {Promise<Array>}
 */
export const listAllExports = async () => {
    try {
        const list = await AnalyticsExport.find()
            .sort({ createdAt: -1 })
            .lean();
        return list.map(item => ({
            exportId: item._id,
            clientId: item.clientId,
            totalRecords: item.totalRecords,
            createdAt: item.createdAt,
            expiresIn: 3600 // 1 hour standard expiry for pre-signed URLs
        }));
    } catch (error) {
        logger.error('Error listing exports from MongoDB:', error);
        throw error;
    }
};

