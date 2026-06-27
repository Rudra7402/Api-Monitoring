import logger from '../../../shared/config/logger.js';
import ApiHit from '../../../shared/models/ApiHits.js';
import mongoose from 'mongoose';

/**
 * Analytics Service
 * Handles all business logic for calculating and aggregating metrics
 * 
 * Uses Mongoose aggregation directly - no need for collection injection
 * All functions are now standalone and don't require mongoCollection parameter
 */

/**
 * Calculate overall dashboard metrics
 * @param {string} clientId - Client ID to filter metrics
 * @param {Date} startTime - Start of date range
 * @param {Date} endTime - End of date range
 * @returns {Promise<Object>} - Overall stats (totalRequests, errors, avgResponseTime, successRate)
 */
export const getDashboardStats = async (clientId, startTime, endTime) => {
    try {
        // Mongoose aggregation - returns array directly when awaited
        const results = await ApiHit.aggregate([
            // Step 1: Match documents for this client and date range
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    timestamp: {
                        $gte: new Date(startTime),
                        $lte: new Date(endTime)
                    }
                }
            },
            // Step 2: Group and calculate stats
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    successfulRequests: {
                        $sum: {
                            $cond: [{ $lt: ['$statusCode', 400] }, 1, 0]
                        }
                    },
                    errorRequests: {
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    },
                    avgResponseTime: { $avg: '$latencyMs' },
                    minResponseTime: { $min: '$latencyMs' },
                    maxResponseTime: { $max: '$latencyMs' }
                }
            },
            // Step 3: Add calculated fields
            {
                $addFields: {
                    successRate: {
                        $cond: [
                            { $eq: ['$totalRequests', 0] },
                            0,
                            { $round: [{ $multiply: [{ $divide: ['$successfulRequests', '$totalRequests'] }, 100] }, 2] }
                        ]
                    },
                    errorRate: {
                        $cond: [
                            { $eq: ['$totalRequests', 0] },
                            0,
                            { $round: [{ $multiply: [{ $divide: ['$errorRequests', '$totalRequests'] }, 100] }, 2] }
                        ]
                    }
                }
            },
            // Step 4: Remove _id field and round numbers
            {
                $project: {
                    _id: 0,
                    totalRequests: 1,
                    successfulRequests: 1,
                    errorRequests: 1,
                    successRate: 1,
                    errorRate: 1,
                    avgResponseTime: { $round: ['$avgResponseTime', 2] },
                    minResponseTime: 1,
                    maxResponseTime: 1
                }
            }
        ]);

        const stats = results[0] || {
            totalRequests: 0,
            successfulRequests: 0,
            errorRequests: 0,
            successRate: 0,
            errorRate: 0,
            avgResponseTime: 0,
            minResponseTime: 0,
            maxResponseTime: 0
        };

        logger.info('Dashboard stats calculated', { clientId });
        return stats;

    } catch (error) {
        logger.error('Error calculating dashboard stats:', error);
        throw error;
    }
};

/**
 * Get top endpoints by request count
 * @param {string} clientId - Client ID
 * @param {Date} startTime - Start of date range
 * @param {Date} endTime - End of date range
 * @param {number} limit - Number of top endpoints to return (default: 10)
 * @returns {Promise<Array>} - Array of top endpoints with stats
 */
export const getTopEndpoints = async (clientId, startTime, endTime, limit = 10) => {
    try {
        const results = await ApiHit.aggregate([
            // Match documents
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    timestamp: {
                        $gte: new Date(startTime),
                        $lte: new Date(endTime)
                    }
                }
            },
            // Group by endpoint and method
            {
                $group: {
                    _id: {
                        endpoint: '$endpoint',
                        method: '$method'
                    },
                    totalHits: { $sum: 1 },
                    errorCount: {
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    },
                    avgLatency: { $avg: '$latencyMs' },
                    minLatency: { $min: '$latencyMs' },
                    maxLatency: { $max: '$latencyMs' }
                }
            },
            // Reshape output
            {
                $project: {
                    _id: 0,
                    endpoint: '$_id.endpoint',
                    method: '$_id.method',
                    totalHits: 1,
                    errorCount: 1,
                    avgLatency: { $round: ['$avgLatency', 2] },
                    minLatency: { $round: ['$minLatency', 2] },
                    maxLatency: { $round: ['$maxLatency', 2] },
                    errorRate: {
                        $cond: [
                            { $eq: ['$totalHits', 0] },
                            0,
                            {
                                $round: [
                                    { $multiply: [{ $divide: ['$errorCount', '$totalHits'] }, 100] },
                                    2
                                ]
                            }
                        ]
                    }
                }
            },
            // Sort by total hits descending
            {
                $sort: { totalHits: -1 }
            },
            // Limit to top N
            {
                $limit: limit
            }
        ]);

        logger.info(`Retrieved top ${results.length} endpoints`, { clientId });
        return results;

    } catch (error) {
        logger.error('Error getting top endpoints:', error);
        throw error;
    }
};

/**
 * Get status code distribution
 * @param {string} clientId - Client ID
 * @param {Date} startTime - Start of date range
 * @param {Date} endTime - End of date range
 * @returns {Promise<Array>} - Array of status codes with counts
 */
export const getStatusCodeDistribution = async (clientId, startTime, endTime) => {
    try {
        const results = await ApiHit.aggregate([
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    timestamp: {
                        $gte: new Date(startTime),
                        $lte: new Date(endTime)
                    }
                }
            },
            // Group by status code
            {
                $group: {
                    _id: '$statusCode',
                    count: { $sum: 1 }
                }
            },
            // Calculate total for percentage
            {
                $facet: {
                    distribution: [
                        { $sort: { _id: 1 } }
                    ],
                    total: [
                        {
                            $group: {
                                _id: null,
                                totalCount: { $sum: '$count' }
                            }
                        }
                    ]
                }
            },
            // Add percentage to each status
            {
                $unwind: '$total'
            },
            {
                $project: {
                    distribution: {
                        $map: {
                            input: '$distribution',
                            as: 'item',
                            in: {
                                statusCode: '$$item._id',
                                count: '$$item.count',
                                percentage: {
                                    $round: [
                                        { $multiply: [{ $divide: ['$$item.count', '$total.totalCount'] }, 100] },
                                        2
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ]);

        const distribution = results[0]?.distribution || [];
        logger.info('Status code distribution calculated', { clientId });
        return distribution;

    } catch (error) {
        logger.error('Error getting status code distribution:', error);
        throw error;
    }
};

/**
 * Get response time distribution (buckets)
 * @param {string} clientId - Client ID
 * @param {Date} startTime - Start of date range
 * @param {Date} endTime - End of date range
 * @returns {Promise<Array>} - Response time distribution in buckets
 */
export const getResponseTimeDistribution = async (clientId, startTime, endTime) => {
    try {
        const results = await ApiHit.aggregate([
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    timestamp: {
                        $gte: new Date(startTime),
                        $lte: new Date(endTime)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $lt: ['$latencyMs', 100] }, 'fast (0-100ms)',
                            {
                                $cond: [
                                    { $lt: ['$latencyMs', 500] }, 'normal (100-500ms)',
                                    {
                                        $cond: [
                                            { $lt: ['$latencyMs', 1000] }, 'slow (500-1000ms)',
                                            'very slow (>1000ms)'
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id',  // ← Rename _id to category
                    count: 1
                }
            },
            {
                $sort: { category: 1 }
            }
        ]);

        logger.info('Response time distribution calculated', { clientId });
        return results;

    } catch (error) {
        logger.error('Error getting response time distribution:', error);
        throw error;
    }
};

/**
 * Get service-wise breakdown
 * @param {string} clientId - Client ID
 * @param {Date} startTime - Start of date range
 * @param {Date} endTime - End of date range
 * @returns {Promise<Array>} - Service breakdown with stats
 */
export const getServiceBreakdown = async (clientId, startTime, endTime) => {
    try {
        const results = await ApiHit.aggregate([
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    timestamp: {
                        $gte: new Date(startTime),
                        $lte: new Date(endTime)
                    }
                }
            },
            // Group by service
            {
                $group: {
                    _id: '$serviceName',
                    totalRequests: { $sum: 1 },
                    errorCount: {
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    },
                    avgLatency: { $avg: '$latencyMs' },
                    endpointCount: { $addToSet: '$endpoint' }
                }
            },
            // Reshape
            {
                $project: {
                    _id: 0,
                    serviceName: '$_id',
                    totalRequests: 1,
                    errorCount: 1,
                    avgLatency: { $round: ['$avgLatency', 2] },
                    uniqueEndpoints: { $size: '$endpointCount' },
                    errorRate: {
                        $round: [{ $multiply: [{ $divide: ['$errorCount', '$totalRequests'] }, 100] }, 2]
                    }
                }
            },
            // Sort by requests
            {
                $sort: { totalRequests: -1 }
            }
        ]);

        logger.info('Service breakdown calculated', { clientId });
        return results;

    } catch (error) {
        logger.error('Error getting service breakdown:', error);
        throw error;
    }
};




/**
 * Get error rate trend over time
 * Shows how error rate changes each day
 * Useful for detecting degradation patterns
 * 
 * @param {string} clientId - Client ID
 * @param {Date} startTime - Start of date range
 * @param {Date} endTime - End of date range
 * @returns {Promise<Array>} - Daily error rate progression
 */
export const getErrorRateTrend = async (clientId, startTime, endTime) => {
    try {
        const results = await ApiHit.aggregate([
            // Step 1: Filter by client and date range
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    timestamp: {
                        $gte: new Date(startTime),
                        $lte: new Date(endTime)
                    }
                }
            },
            // Step 2: Extract date (YYYY-MM-DD) from timestamp
            {
                $group: {
                    _id: {
                        // Convert timestamp to just the date part (YYYY-MM-DD)
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$timestamp'
                            }
                        }
                    },
                    totalRequests: { $sum: 1 },
                    errorCount: {
                        // Count requests with status code >= 400 as errors
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    }
                }
            },
            // Step 3: Calculate error rate percentage for each day
            {
                $project: {
                    _id: 0,
                    date: '$_id.date',
                    totalRequests: 1,
                    errorCount: 1,
                    // errorRate = (errorCount / totalRequests) * 100
                    errorRate: {
                        $cond: [
                            { $eq: ['$totalRequests', 0] },
                            0,
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ['$errorCount', '$totalRequests'] },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            }
                        ]
                    }
                }
            },
            // Step 4: Sort by date ascending (oldest first)
            {
                $sort: { date: 1 }
            }
        ]);

        logger.info('Error rate trend calculated', { clientId, daysCount: results.length });
        return results;

    } catch (error) {
        logger.error('Error calculating error rate trend:', error);
        throw error;
    }
};


/**
 * Get slowest endpoints by average response time
 * Shows performance bottlenecks that need optimization
 * 
 * @param {string} clientId - Client ID
 * @param {Date} startTime - Start of date range
 * @param {Date} endTime - End of date range
 * @param {number} limit - Number of slowest endpoints (default: 10, max: 100)
 * @returns {Promise<Array>} - Endpoints sorted by average latency (slowest first)
 */
export const getSlowestEndpoints = async (clientId, startTime, endTime, limit = 10) => {
    try {
        const results = await ApiHit.aggregate([
            // Step 1: Filter by client and date range
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    timestamp: {
                        $gte: new Date(startTime),
                        $lte: new Date(endTime)
                    }
                }
            },
            // Step 2: Group by endpoint and method
            {
                $group: {
                    _id: {
                        endpoint: '$endpoint',
                        method: '$method'
                    },
                    totalRequests: { $sum: 1 },
                    // Calculate latency metrics
                    avgLatency: { $avg: '$latencyMs' },
                    minLatency: { $min: '$latencyMs' },
                    maxLatency: { $max: '$latencyMs' },
                    // Count errors for error rate
                    errorCount: {
                        $sum: {
                            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
                        }
                    }
                }
            },
            // Step 3: Reshape output and calculate error rate
            {
                $project: {
                    _id: 0,
                    endpoint: '$_id.endpoint',
                    method: '$_id.method',
                    totalRequests: 1,
                    avgLatency: { $round: ['$avgLatency', 2] },
                    minLatency: { $round: ['$minLatency', 2] },
                    maxLatency: { $round: ['$maxLatency', 2] },
                    // errorRate = (errorCount / totalRequests) * 100
                    errorRate: {
                        $cond: [
                            { $eq: ['$totalRequests', 0] },
                            0,
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ['$errorCount', '$totalRequests'] },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            }
                        ]
                    }
                }
            },
            // Step 4: SORT BY AVERAGE LATENCY (descending = slowest first)
            {
                $sort: { avgLatency: -1 }
            },
            // Step 5: Limit to top N slowest endpoints
            {
                $limit: limit
            }
        ]);

        logger.info(`Retrieved ${results.length} slowest endpoints`, { clientId });
        return results;

    } catch (error) {
        logger.error('Error getting slowest endpoints:', error);
        throw error;
    }
};