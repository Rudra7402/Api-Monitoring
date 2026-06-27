import logger from "../../../shared/config/logger.js";
import ApiKey from "../../../shared/models/ApiKey.js";


// Create API key
const createApiKey = async (apiKeyData) => {

    try {

        const apiKey = await ApiKey.create(apiKeyData);

        logger.info("API key created", {
            keyId: apiKey.keyId
        });

        return apiKey;

    } catch (error) {

        logger.error("Error creating API key", error);
        throw error;
    }
};


// Find API key by key value
const findApiKeyByValue = async (keyValue, includeInactive = false) => {

    try {
        const filter = { keyValue };

        if (!includeInactive) {
            filter.isActive = true;
        }

        const apiKey = await ApiKey.findOne(filter)
            .populate("clientId");

        return apiKey;

    }
    catch (error) {

        logger.error("Error finding API key by value", error);
        throw error;
    }
};


// Find API keys by client ID
const findApiKeysByClientId = async (clientId, filters = {}) => {

    try {

        const query = { clientId, ...filters };

        const apiKeys = await ApiKey.find(query).populate("createdBy", "username email")
            .sort({ createdAt: -1 });

        return apiKeys;

    } catch (error) {

        logger.error("Error finding API keys by client ID", error);
        throw error;
    }
};


// Count API keys by client ID
const countApiKeysByClientId = async (clientId, filters = {}) => {

    try {

        const query = { clientId, ...filters };

        return await ApiKey.countDocuments(query);

    } catch (error) {

        logger.error("Error counting API keys", error);
        throw error;
    }
};

const deactivateApiKey = async (keyId) => {
    try {
        // Assuming your ApiKey model has an isActive boolean
        return await ApiKey.findOneAndUpdate({ keyId }, { isActive: false }, { new: true });
    } catch (error) {
        logger.error("Error deactivating API key", error);
        throw error;
    }
};


export {
    createApiKey,
    findApiKeyByValue,
    findApiKeysByClientId,
    countApiKeysByClientId,
    deactivateApiKey
};