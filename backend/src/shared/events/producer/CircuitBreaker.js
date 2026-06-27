import logger from '../../config/logger.js';


/**
 * Simplified Circuit Breaker
 * Only CLOSED and OPEN states
 */

let circuitState = {
    state: 'CLOSED',
    failures: 0,
    failureThreshold: 5,
    lastFailureTime: 0,
    cooldownMs: 30000
};

/**
 * Check if cooldown completed
 */
function shouldResetAfterCooldown() {

    if (circuitState.state === 'OPEN') {

        const timePassed =
            Date.now() - circuitState.lastFailureTime;

        if (timePassed > circuitState.cooldownMs) {
            return true;
        }
    }

    return false;
}

/**
 * Check if request is allowed
 */
function allowRequest() {

    // Auto reset after cooldown

    if (shouldResetAfterCooldown()) {

        circuitState.state = 'CLOSED';

        circuitState.failures = 0;

        logger.info('[CircuitBreaker] OPEN -> CLOSED (cooldown elapsed)')
    }

    // Allow request if CLOSED

    if (circuitState.state === 'CLOSED') {
        return true;
    }

    logger.warn('[CircuitBreaker] Request rejected because circuit is OPEN');

    return false;
}

/**
 * Record successful request
 */
function recordSuccess() {

    circuitState.failures = 0;

    if (circuitState.state !== 'CLOSED') {

        circuitState.state = 'CLOSED';

        logger.info('[CircuitBreaker] Recovered! Circuit back to CLOSED');
    }
}

/**
 * Record failed request
 */
function recordFailure() {

    circuitState.failures++;

    circuitState.lastFailureTime = Date.now();

    logger.error(`[CircuitBreaker] Failure ${circuitState.failures}/${circuitState.failureThreshold}`);

    // Open circuit if threshold reached

    if (circuitState.failures >= circuitState.failureThreshold) {

        circuitState.state = 'OPEN';

        logger.warn('[CircuitBreaker] OPEN - Too many failures! Rejecting requests temporarily');
    }
}

/**
 * Get current state
 */
function getState() {

    return {
        state: circuitState.state,
        failures: circuitState.failures,
        threshold: circuitState.failureThreshold,
        lastFailureTime: circuitState.lastFailureTime
    };
}

/**
 * Initialize circuit breaker options
 */
function initCircuitBreaker(options = {}) {

    circuitState.failureThreshold =
        options.failureThreshold || 5;

    circuitState.cooldownMs =
        options.cooldownMs || 30000;
}

export {
    allowRequest,
    recordSuccess,
    recordFailure,
    getState,
    initCircuitBreaker
};