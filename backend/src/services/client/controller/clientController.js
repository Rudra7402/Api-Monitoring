import {
    createNewClient,
    createClientUser,
    createNewApiKey,
    getClientApiKeys,
    getClientProfile,
    getAllClients,
    getClientUsers,
    deactivateClientUser,
    revokeApiKey,
    updateClientDetails,
    updateUserPermissions,
    updateUserRole
} from "../service/clientService.js";

import authService from "../../auth/service/authService.js";




// Create a new client, only accessible by super admins
const createClient = async (req, res) => {

    try {

        const isSuperAdmin = await authService.checkSuperAdminPermissions(req.user.userId);

        if (!isSuperAdmin) {

            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const client = await createNewClient(req.body, req.user);

        return res.status(201).json({
            success: true,
            message: "Client created successfully",
            data: client
        });

    } catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Access denied") ? 403 :
                    error.message.includes("already exists") ? 409 :
                        400;

        return res.status(status).json({
            success: false,
            message: error.message
        });
    }
};




// Create a new client user for a specific client
const createClientUserController = async (req, res) => {

    try {

        const { clientId } = req.params;

        const user = await createClientUser(clientId, req.body, req.user);

        return res.status(201).json({
            success: true,
            message: "Client user created successfully",
            data: user
        });

    } catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Access denied") ? 403 :
                    error.message.includes("already exists") ? 409 :
                        400;

        return res.status(status).json({
            success: false,
            message: error.message
        });
    }

};




// Create a new API key for a specific client
const createApiKey = async (req, res) => {

    try {

        const { clientId } = req.params;

        const apiKey = await createNewApiKey(clientId, req.body, req.user);

        return res.status(201).json({
            success: true,
            message: "API key created successfully",
            data: apiKey
        });

    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Access denied") ? 403 :
                    error.message.includes("already exists") ? 409 :
                        400;

        return res.status(status).json({
            success: false,
            message: error.message
        });
    }

};




// Get all API keys for a specific client
const getClientApiKeysController = async (req, res) => {

    try {

        const { clientId } = req.params;

        const apiKeys = await getClientApiKeys(clientId, req.user);

        return res.status(200).json({
            success: true,
            message: "API keys fetched successfully",
            data: apiKeys
        });

    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Access denied") ? 403 :
                    error.message.includes("already exists") ? 409 :
                        400;

        return res.status(status).json({
            success: false,
            message: error.message
        });
    }

};


const getClientProfileController = async (req, res) => {
    try {
        const client = await getClientProfile(req.params.clientId, req.user);
        return res.status(200).json({
            success: true,
            message: "Client profile fetched successfully",
            data: client
        });
    } catch (error) {
        const status = error.message.includes("not found") ? 404 :
            error.message.includes("Access denied") ? 403 : 400;

        return res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

// Get all clients
const getAllClientsController = async (req, res) => {
    try {
        const clients = await getAllClients(req.user);
        return res.status(200).json({
            success: true,
            message: "Clients fetched successfully",
            data: clients
        });
    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Access denied") ? 403 :
                    error.message.includes("already exists") ? 409 :
                        400;

        return res.status(status).json({
            success: false,
            message: error.message
        });
    }
};


const getClientUsersController = async (req, res) => {
    try {
        const users = await getClientUsers(req.params.clientId, req.user);
        return res.status(200).json({ success: true, data: users });
    } catch (error) {
        return res.status(error.message.includes("Access denied") ? 403 : 400).json({ success: false, message: error.message });
    }
};

const deactivateClientUserController = async (req, res) => {
    try {
        const user = await deactivateClientUser(req.params.clientId, req.params.userId, req.user);
        return res.status(200).json({ success: true, message: "User deactivated successfully", data: user });
    } catch (error) {
        return res.status(error.message.includes("Access denied") ? 403 : 400).json({ success: false, message: error.message });
    }
};

const revokeApiKeyController = async (req, res) => {
    try {
        const key = await revokeApiKey(req.params.clientId, req.params.keyId, req.user);
        return res.status(200).json({ success: true, message: "API key revoked successfully", data: key });
    } catch (error) {
        return res.status(error.message.includes("Access denied") ? 403 : 400).json({ success: false, message: error.message });
    }
};

// Update client
const updateClientController = async (req, res) => {
    try {
        const client = await updateClientDetails(req.params.clientId, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: "Client updated successfully",
            data: client
        });
    } catch (error) {
        const status = error.message.includes("not found") ? 404 :
            error.message.includes("Access denied") ? 403 : 400;
        return res.status(status).json({
            success: false,
            message: error.message
        });
    }
};


// Update user permissions
const updateUserPermissionsController = async (req, res) => {
    try {
        const user = await updateUserPermissions(req.params.clientId, req.params.userId, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: "User permissions updated successfully",
            data: user
        });
    } catch (error) {
        const status = error.message.includes("Access denied") ? 403 : 400;
        return res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

const updateUserRoleController = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await updateUserRole(req.params.clientId, req.params.userId, role, req.user);
        return res.status(200).json({
            success: true,
            message: "User role updated successfully",
            data: user
        });
    } catch (error) {
        const status = error.message.includes("Access denied") ? 403 : 400;
        return res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

export {
    createClient,
    createClientUserController,
    createApiKey,
    getClientApiKeysController,
    getClientProfileController,
    getAllClientsController,
    getClientUsersController,
    deactivateClientUserController,
    revokeApiKeyController,
    updateClientController,
    updateUserPermissionsController,
    updateUserRoleController
};