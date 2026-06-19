import logger from "../../../shared/config/logger.js";

import { APPLICATION_ROLES, isValidClientRole } from "../../../shared/constants/role.js";

import { createClient, findClientById, findClientBySlug, getClients, updateClient } from "../repository/ClientRepository.js";

import { createApiKey, findApiKeysByClientId, findApiKeyByValue, deactivateApiKey } from "../repository/ApiKeyRepository.js";

import userRepository from "../../auth/repository/userRepository.js";

import { v4 as uuidv4 } from "uuid";

import crypto from "crypto";

import bcrypt from "bcryptjs";




// Remove password from response
const formatClientUserResponse = (user) => {

    const userObj = user.toObject();

    delete userObj.password;

    return userObj;
};




// Generate slug
const generateSlug = (name) => {

    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
};



// Create client
const createNewClient = async (clientData, adminUser) => {

    try {

        const { name, email, description, website } = clientData;

        if (!name || !email) {
            throw new Error("Client name and email are required");
        }

        // Check for duplicate email
        const existingUser = await userRepository.findUserByEmail(email);

        if (existingUser) {
            throw new Error("Email already exists");
        }


        // Generate slug
        const slug = generateSlug(name);


        // Check existing client
        const existingClient = await findClientBySlug(slug);

        if (existingClient) {
            throw new Error(`Client with slug ${slug} already exists`);
        }

        // Create client
        const client = await createClient({
            name,
            slug,
            email,
            description,
            website,
            createdBy: adminUser.userId
        });

        return client;

    } catch (error) {

        logger.error("Error creating client", error);

        throw error;
    }
};


// Check client access
const canUserAccessClient = (user, clientId) => {

    // Super admin can access all clients
    if (user.role === APPLICATION_ROLES.SUPER_ADMIN) {
        return true;
    }

    // Client users can access only their client
    return (
        user.clientId &&
        user.clientId.toString() === clientId.toString()
    );
};




// Create a new client user for a specific client
const createClientUser = async (clientId, userData, adminUser) => {

    try {

        // Access check
        if (!canUserAccessClient(adminUser, clientId)) {

            throw new Error("Access denied");
        }

        if (adminUser.role !== APPLICATION_ROLES.SUPER_ADMIN && adminUser.role !== APPLICATION_ROLES.CLIENT_ADMIN) {
            throw new Error("Only admins can create client users");
        }





        const {
            username,
            email,
            password,
            role = APPLICATION_ROLES.CLIENT_VIEWER
        } = userData;

        if (!username || !email || !password) {
            throw new Error("Username, email and password are required");
        }

        // Validate role
        if (!isValidClientRole(role)) {
            throw new Error(
                "Invalid role for client user"
            );
        }

        // Check client exists
        const client =
            await findClientById(clientId);

        if (!client) {
            throw new Error("Client not found");
        }

        // Default permissions
        let permissions = {
            canCreateApiKeys: false,
            canManageUsers: false,
            canViewAnalytics: true,
            canExportData: false
        };

        // Admin permissions
        if (role === APPLICATION_ROLES.CLIENT_ADMIN) {

            permissions = {
                canCreateApiKeys: true,
                canManageUsers: true,
                canViewAnalytics: true,
                canExportData: true
            };
        }

        if (!password) {
            throw new Error("Password is required");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await userRepository.createUser({
            username,
            email,
            password: hashedPassword,
            role,
            clientId,
            permissions
        });

        logger.info("Client user created", {
            clientId,
            userId: user._id,
            role
        });

        return formatClientUserResponse(user);

    } catch (error) {

        logger.error(
            "Error creating client user",
            error
        );

        throw error;
    }
};




// Generate API key
const generateApiKey = () => {

    const prefix = "apim";

    const randomBytes = crypto.randomBytes(20).toString("hex");

    return `${prefix}_${randomBytes}`;
};




// Create a new API key for a specific client
const createNewApiKey = async (clientId, keyData, user) => {

    try {

        // Check client exists
        const client = await findClientById(clientId);

        if (!client) {
            throw new Error("Client not found");
        }

        // Access check
        if (!canUserAccessClient(user, clientId)) {

            throw new Error("Access denied");
        }

        // Only admins can create API keys
        if (user.role !== APPLICATION_ROLES.SUPER_ADMIN && user.role !== APPLICATION_ROLES.CLIENT_ADMIN) {
            throw new Error("Only admins can create API keys");
        }

        // const { name, description, environment = "production" } = keyData;

        const {
            name,
            description,
            environment = "production",
            permissions = {}
        } = keyData;


        if (!name) {
            throw new Error("API key name is required");
        }

        // Generate key details
        const keyId = uuidv4();

        const keyValue = generateApiKey();

        // Create API key
        const apiKey = await createApiKey({
            keyId,
            keyValue,
            clientId,
            name,
            description,
            environment,
            permissions: {
                canIngest: permissions.canIngest ?? true,
                canReadAnalytics: permissions.canReadAnalytics ?? true,
                allowedServices: permissions.allowedServices ?? []
            },
            createdBy: user.userId
        });

        logger.info("API key created", {
            keyId: apiKey.keyId
        });

        return apiKey;

    } catch (error) {

        logger.error(
            "Error creating API key",
            error
        );

        throw error;
    }
};




// Get all API keys for a specific client
const getClientApiKeys = async (clientId, user) => {

    try {

        // Access check
        if (!canUserAccessClient(user, clientId)) {
            throw new Error("Access denied to this client");
        }

        // Fetch keys
        const apiKeys = await findApiKeysByClientId(clientId);

        // Hide actual key value
        const formattedResponse = apiKeys.map((key) => {

            const keyObj = key.toObject();

            delete keyObj.keyValue;

            return keyObj;
        });

        return formattedResponse;

    } catch (error) {

        logger.error(
            "Error getting client API keys",
            error
        );

        throw error;
    }
};




// Get client from API key
const getClientByApiKey = async (apiKey) => {

    try {

        // Find API key
        const key = await findApiKeyByValue(apiKey);

        if (!key) {
            return null;
        }

        // Check expiry
        if (key.isExpired()) {
            return null;
        }

        // Populated client object
        const client = key.clientId;

        return {
            client,
            apiKey: key
        };

    } catch (error) {

        logger.error(
            "Error getting client by API key",
            error
        );

        throw error;
    }
};



// Get all clients (Super Admin only)
const getAllClients = async (adminUser) => {
    try {
        if (adminUser.role !== APPLICATION_ROLES.SUPER_ADMIN) {
            throw new Error("Access denied");
        }

        const clients = await getClients();
        return clients;
    } catch (error) {
        logger.error("Error getting all clients", error);
        throw error;
    }
};


// Get Client Users
const getClientUsers = async (clientId, adminUser) => {
    if (!canUserAccessClient(adminUser, clientId)) throw new Error("Access denied");
    return await userRepository.findUsersByClientId(clientId);
};

// Deactivate Client User
const deactivateClientUser = async (clientId, userId, adminUser) => {
    if (!canUserAccessClient(adminUser, clientId)) throw new Error("Access denied");
    if (adminUser.role !== APPLICATION_ROLES.SUPER_ADMIN && adminUser.role !== APPLICATION_ROLES.CLIENT_ADMIN) throw new Error("Only admins can deactivate users");

    const user = await userRepository.findUserById(userId);
    if (!user || user.clientId.toString() !== clientId.toString()) throw new Error("User not found in this client");

    return await userRepository.deactivateUser(userId);
};

// Revoke API Key
const revokeApiKey = async (clientId, keyId, adminUser) => {
    if (!canUserAccessClient(adminUser, clientId)) throw new Error("Access denied");
    if (adminUser.role !== APPLICATION_ROLES.SUPER_ADMIN && adminUser.role !== APPLICATION_ROLES.CLIENT_ADMIN) throw new Error("Only admins can revoke API keys");

    return await deactivateApiKey(keyId);
};

// Update client
const updateClientDetails = async (clientId, updateData, adminUser) => {
    try {
        // Only super admins can update clients
        if (adminUser.role !== APPLICATION_ROLES.SUPER_ADMIN) {
            throw new Error("Access denied");
        }

        // Check client exists
        const client = await findClientById(clientId);
        if (!client) {
            throw new Error("Client not found");
        }

        // Allowed fields only
        const allowedUpdates = ["name", "description", "website", "email"];
        const updateObject = {};

        allowedUpdates.forEach(field => {
            if (updateData[field] !== undefined) {
                updateObject[field] = updateData[field];
            }
        });

        // If name changed, regenerate slug
        if (updateData.name) {
            const newSlug = generateSlug(updateData.name);
            const slugExists = await findClientBySlug(newSlug);
            if (slugExists && slugExists._id.toString() !== clientId) {
                throw new Error(`Client with slug ${newSlug} already exists`);
            }
            updateObject.slug = newSlug;
        }

        const updatedClient = await updateClient(clientId, updateObject);
        return updatedClient;

    } catch (error) {
        logger.error("Error updating client details", error);
        throw error;
    }
};


// Update user permissions
const updateUserPermissions = async (clientId, userId, newPermissions, adminUser) => {
    try {
        // Access check
        if (!canUserAccessClient(adminUser, clientId)) {
            throw new Error("Access denied");
        }

        // Only admins can update permissions
        if (adminUser.role !== APPLICATION_ROLES.SUPER_ADMIN &&
            adminUser.role !== APPLICATION_ROLES.CLIENT_ADMIN) {
            throw new Error("Only admins can update user permissions");
        }

        // Fetch user
        const user = await userRepository.findUserById(userId);
        if (!user || user.clientId.toString() !== clientId.toString()) {
            throw new Error("User not found in this client");
        }

        // Validate and set permissions
        const permissions = {
            canCreateApiKeys: newPermissions.canCreateApiKeys ?? false,
            canManageUsers: newPermissions.canManageUsers ?? false,
            canViewAnalytics: newPermissions.canViewAnalytics ?? true,
            canExportData: newPermissions.canExportData ?? false
        };

        const updatedUser = await userRepository.updateUser(userId, { permissions });
        return formatClientUserResponse(updatedUser);

    } catch (error) {
        logger.error("Error updating user permissions", error);
        throw error;
    }
};

export {
    createNewClient,
    createClientUser,
    createNewApiKey,
    getClientApiKeys,
    getClientByApiKey,
    getAllClients,
    getClientUsers,
    deactivateClientUser,
    revokeApiKey,
    updateClientDetails,
    updateUserPermissions
};
