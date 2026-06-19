import ApiHit from '../../../shared/models/ApiHits.js';
import logger from '../../../shared/config/logger.js';

/**
 * Save API hit to MongoDB
 */
async function saveApiHit(eventData) {
    try {
        const doc = new ApiHit(eventData);

        await doc.save();

        logger.info('API hit saved to MongoDB', {
            eventId: eventData.eventId
        });

        return doc;

    } catch (error) {

        if (error.code === 11000) {
            logger.warn('Duplicate event ID, skipping save', {
                eventId: eventData.eventId
            });

            return null;
        }

        logger.error('Error saving API hit:', error);
        throw error;
    }
}

/**
 * Find API hits
 */
async function findApiHits(filters = {}, options = {}) {
    try {

        const {
            limit = 100,
            skip = 0,
            sort = { timestamp: -1 }
        } = options;

        const hits = await ApiHit
            .find(filters)
            .sort(sort)
            .limit(limit)
            .skip(skip)
            .lean();

        return hits;

    } catch (error) {
        logger.error('Error finding API hits:', error);
        throw error;
    }
}

/**
 * Count API hits
 */
async function countApiHits(filters = {}) {
    try {

        const count = await ApiHit.countDocuments(filters);

        return count;

    } catch (error) {
        logger.error('Error counting API hits:', error);
        throw error;
    }
}

/**
 * Delete old API hits
 */
async function deleteOldApiHits(beforeDate) {
    try {

        const result = await ApiHit.deleteMany({
            timestamp: {
                $lt: beforeDate
            }
        });

        logger.info('Deleted old API hits', {
            count: result.deletedCount
        });

        return result.deletedCount;

    } catch (error) {
        logger.error('Error deleting old API hits:', error.message);
        throw error;
    }
}

export {
    saveApiHit,
    findApiHits,
    countApiHits,
    deleteOldApiHits
};