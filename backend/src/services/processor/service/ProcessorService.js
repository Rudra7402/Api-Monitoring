import logger from '../../../shared/config/logger.js';
import {
    saveApiHit
} from '../repository/ApiHitRepository.js';
import { recordSuccess, recordFailure } from './metrics.js';

export const processEvent = async (eventData) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const doc = await saveApiHit(eventData);

            logger.info('Event saved to MongoDB', {
                eventId: eventData.eventId
            });

            recordSuccess();
            return doc;
        } catch (error) {
            lastError = error;

            if (attempt === MAX_RETRIES) {
                break;
            }

            logger.warn(
                `Retry ${attempt + 1}/${MAX_RETRIES} for eventId: ${eventData.eventId}`,
                {
                    error: error.message
                }
            );

            await new Promise(resolve =>
                setTimeout(resolve, RETRY_DELAY * (attempt + 1))
            );
        }
    }

    logger.error('Max retries exhausted', {
        eventId: eventData.eventId,
        error: lastError.message
    });

    recordFailure();
    throw lastError;
};