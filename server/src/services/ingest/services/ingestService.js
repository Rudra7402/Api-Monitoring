import logger from "../../../shared/config/logger.js";
import { v4 as uuidv4 } from "uuid";

import { publishApiHit } from "../../../shared/events/producer/eventProducer.js";
import config from "../../../shared/config/index.js";

//Ingests an API hit by validating the hit data and publishing an event to RabbitMQ.
export async function ingestApiHit(hitData) {

    try {

        const requiredFields = [
            "serviceName",
            "endpoint",
            "method",
            "statusCode",
            "latencyMs",
            "clientId"
        ];

        // const missingFields = requiredFields.filter(
        //     (field) => !hitData[field]
        // );
        const missingFields = requiredFields.filter(
            (field) =>
                hitData[field] === undefined ||
                hitData[field] === null ||
                hitData[field] === ""
        );


        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
        }


        // Trim whitespace from string fields
        hitData.serviceName = String(hitData.serviceName).trim();
        hitData.endpoint = String(hitData.endpoint).trim();

        // Reject empty strings after trimming
        if (!hitData.serviceName || hitData.serviceName === "") {
            throw new Error("serviceName cannot be empty");
        }
        if (!hitData.endpoint || hitData.endpoint === "") {
            throw new Error("endpoint cannot be empty");
        }

        const validMethods = [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
            "HEAD"
        ];

        if (!validMethods.includes(hitData.method.toUpperCase())) {
            throw new Error(`Invalid HTTP method: ${hitData.method}`);
        }

        const statusCode = Number(hitData.statusCode);

        if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
            throw new Error(`Invalid status code: ${hitData.statusCode}`);
        }

        const latencyMs = Number(hitData.latencyMs);

        if (isNaN(latencyMs) || latencyMs < 0) {
            throw new Error(`Invalid latency: ${hitData.latencyMs}`);
        }

        // Check max latency (5 minutes = 300000ms)
        const MAX_LATENCY_MS = 300000;
        if (latencyMs > MAX_LATENCY_MS) {
            throw new Error(`Latency exceeds maximum allowed (${MAX_LATENCY_MS}ms): ${latencyMs}ms`);
        }

        // Check for non-integer status code
        if (!Number.isInteger(statusCode)) {
            throw new Error(`Status code must be an integer, not ${hitData.statusCode}`);
        }


        // Validate string lengths
        const MAX_SERVICE_NAME_LENGTH = 100;
        const MAX_ENDPOINT_LENGTH = 500;
        const MAX_USER_AGENT_LENGTH = 500;

        if (hitData.serviceName.length > MAX_SERVICE_NAME_LENGTH) {
            throw new Error(`serviceName exceeds maximum length of ${MAX_SERVICE_NAME_LENGTH} characters`);
        }

        if (hitData.endpoint.length > MAX_ENDPOINT_LENGTH) {
            throw new Error(`endpoint exceeds maximum length of ${MAX_ENDPOINT_LENGTH} characters`);
        }

        if (hitData.userAgent && hitData.userAgent.length > MAX_USER_AGENT_LENGTH) {
            throw new Error(`userAgent exceeds maximum length of ${MAX_USER_AGENT_LENGTH} characters`);
        }


        const event = {
            eventId: uuidv4(),
            timestamp: new Date(),

            serviceName: hitData.serviceName,
            endpoint: hitData.endpoint,

            method: hitData.method.toUpperCase(),
            statusCode,
            latencyMs,

            clientId: hitData.clientId,
            apiKeyId: hitData.apiKeyId,

            ip: hitData.ip || "unknown",
            userAgent: hitData.userAgent || ""
        };

        const published = await publishApiHit(
            event,
            config.rabbitmq.queue
        );

        if (!published) {

            logger.warn('Event rejected by circuit breaker');

            return {
                eventId: event.eventId,
                status: "rejected",
                reason: "service_unavailable",
                timestamp: event.timestamp
            };
        }

        logger.info(`API hit queued: ${event.eventId}`);

        return {
            eventId: event.eventId,
            status: "queued",
            timestamp: event.timestamp
        };

    }
    catch (error) {
        logger.error("Error ingesting API hit", error);
        throw error; // Let the controller handle the HTTP response!
    }
}
