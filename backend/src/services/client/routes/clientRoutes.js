import express from "express";

import authenticate from "../../../shared/middlewares/authenticateMiddleware.js";
import authorise from "../../../shared/middlewares/authoriseMiddleware.js";
import { APPLICATION_ROLES } from "../../../shared/constants/role.js";

import { createClient, createClientUserController, createApiKey, getClientApiKeysController, getAllClientsController, getClientUsersController, deactivateClientUserController, revokeApiKeyController, updateClientController, updateUserPermissionsController, updateUserRoleController, getClientProfileController } from "../controller/clientController.js";


const clientRouter = express.Router();


// Protected routes
clientRouter.use(authenticate);



// Create new client
clientRouter.post("/admin/clients/onboard", createClient);



// Create client user
clientRouter.post("/admin/clients/:clientId/users", createClientUserController);



// Create API key
clientRouter.post("/admin/clients/:clientId/api/keys", createApiKey);



// Get all API keys
clientRouter.get("/admin/clients/:clientId/api/keys", getClientApiKeysController);

// Get a single client profile (accessible by the client owner/admin or super admin)
clientRouter.get("/admin/clients/:clientId", getClientProfileController);

// Get all clients
clientRouter.get(
    "/admin/clients",
    authorise([APPLICATION_ROLES.SUPER_ADMIN]),
    getAllClientsController
);


// Get all users for a client
clientRouter.get("/admin/clients/:clientId/users", getClientUsersController);

// Deactivate a client user
clientRouter.patch("/admin/clients/:clientId/users/:userId/deactivate", deactivateClientUserController);

// Revoke an API key
clientRouter.patch("/admin/clients/:clientId/api/keys/:keyId/revoke", revokeApiKeyController);

// Update client
clientRouter.put("/admin/clients/:clientId", updateClientController);

// Update user permissions
clientRouter.patch("/admin/clients/:clientId/users/:userId/permissions", updateUserPermissionsController);

// Update user role
clientRouter.patch("/admin/clients/:clientId/users/:userId/role", updateUserRoleController);

export default clientRouter;