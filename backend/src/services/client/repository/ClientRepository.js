import Client from "../../../shared/models/Client.js";
import logger from "../../../shared/config/logger.js";

// Creates a new client
const createClient = async (clientData) => {
    try {
        const client = await Client.create(clientData);

        logger.info("Client created", {
            clientId: client._id,
            slug: client.slug
        });

        return client;
    }

    catch (error) {
        logger.error("Error creating client", error);
        throw error;
    }
};

// Find a client by ID
const findClientById = async (clientId) => {
    try {
        const client = await Client.findById(clientId);

        logger.info("Client fetched by ID", {
            clientId
        });

        return client;

    } catch (error) {
        logger.error("Error finding client by ID", error);
        throw error;
    }
};


// Find a client by slug
const findClientBySlug = async (slug) => {
    try {
        return await Client.findOne({ slug });

    } catch (error) {
        logger.error("Error finding client by slug", error);
        throw error;
    }
};


// Find clients with filters and pagination
const getClients = async (filters = {}, options = {}) => {
    try {

        const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

        return await Client.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit);

    } catch (error) {
        logger.error("Error fetching clients", error);
        throw error;
    }
};


// Count clients matching filters
const countClients = async (filters = {}) => {
    try {
        return await Client.countDocuments(filters);

    } catch (error) {
        logger.error("Error counting clients", error);
        throw error;
    }
};


// Update client
const updateClient = async (clientId, updateData) => {
    try {
        const client = await Client.findByIdAndUpdate(
            clientId,
            updateData,
            { new: true, runValidators: true }
        );

        logger.info("Client updated", {
            clientId,
            updatedFields: Object.keys(updateData)
        });

        return client;

    } catch (error) {
        logger.error("Error updating client", error);
        throw error;
    }
};

export {
    createClient,
    findClientById,
    findClientBySlug,
    getClients,
    countClients,
    updateClient
};