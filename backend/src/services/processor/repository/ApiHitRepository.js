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

            // Option 1: Find and return existing document
            const existingDoc = await ApiHit.findOne({
                eventId: eventData.eventId
            });

            logger.warn('Duplicate event ID, skipping save', {
                eventId: eventData.eventId
            });

            return existingDoc;
        }

        logger.error('Error saving API hit:', error);
        throw error;
    }
}



export {
    saveApiHit
};