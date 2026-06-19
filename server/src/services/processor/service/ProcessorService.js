import ApiHit from '../../../shared/models/ApiHits.js'
import logger from '../../../shared/config/logger.js';
import {
    saveApiHit,
    findApiHits,
    countApiHits,
    deleteOldApiHits
} from '../repository/ApiHitRepository.js';
export const processEvent = async (eventData) => {

    try {

        const doc = await saveApiHit(eventData);

        logger.info('Event saved to MongoDB', {
            eventId: eventData.eventId,
            endpoint: eventData.endpoint
        });

        return doc;

    } catch (error) {

        logger.error('Error processing event', {
            error: error.message,
            eventId: eventData.eventId
        });

        throw error;
    }
};