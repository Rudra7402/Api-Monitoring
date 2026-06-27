// // metrics.js (NEW FILE)
// let metrics = {
//     totalProcessed: 0,
//     totalFailed: 0,
//     totalDuplicate: 0,
//     startTime: Date.now(),
//     lastProcessedTime: null
// };

// export function recordSuccess() {
//     metrics.totalProcessed++;
//     metrics.lastProcessedTime = Date.now();
// }

// export function recordFailure() {
//     metrics.totalFailed++;
// }

// export function recordDuplicate() {
//     metrics.totalDuplicate++;
// }

// export function getMetrics() {
//     const uptime = Date.now() - metrics.startTime;
//     const mins = uptime / 60000;

//     return {
//         ...metrics,
//         uptime,
//         messagesPerMinute: mins > 0 ? (metrics.totalProcessed / mins).toFixed(2) : "0.00",
//         errorRate: metrics.totalProcessed > 0 
//             ? ((metrics.totalFailed / metrics.totalProcessed) * 100).toFixed(2) 
//             : "0.00"
//     };
// }









import ApiHit from '../../../shared/models/ApiHits.js';
import DLQMessage from '../../../shared/models/DLQMessage.js';
import logger from '../../../shared/config/logger.js';

let metrics = {
    totalProcessed: 0,
    totalFailed: 0,
    totalDuplicate: 0,
    startTime: Date.now(),
    lastProcessedTime: null
};

// Initialize metrics from MongoDB on startup
export async function initializeMetrics() {
    try {
        const [hitsCount, dlqCount, lastHit] = await Promise.all([
            ApiHit.countDocuments(),
            DLQMessage.countDocuments(),
            ApiHit.findOne().sort({ timestamp: -1 }).lean()
        ]);
        metrics.totalProcessed = hitsCount;
        metrics.totalFailed = dlqCount;
        if (lastHit) {
            metrics.lastProcessedTime = lastHit.timestamp || lastHit.createdAt;
        }
        logger.info('Metrics successfully loaded from MongoDB', { hitsCount, dlqCount });
    } catch (error) {
        logger.error('Failed to initialize metrics from MongoDB on startup:', error);
    }
}

export function recordSuccess() {
    metrics.totalProcessed++;
    metrics.lastProcessedTime = Date.now();
}

export function recordFailure() {
    metrics.totalFailed++;
}

export function recordDuplicate() {
    metrics.totalDuplicate++;
}

export function getMetrics() {
    const uptime = Date.now() - metrics.startTime;
    const mins = uptime / 60000;

    return {
        ...metrics,
        uptime,
        messagesPerMinute: mins > 0 ? (metrics.totalProcessed / mins).toFixed(2) : "0.00",
        errorRate: metrics.totalProcessed > 0
            ? ((metrics.totalFailed / metrics.totalProcessed) * 100).toFixed(2)
            : "0.00"
    };
}
