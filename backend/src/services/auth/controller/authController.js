import config from "../../../shared/config/index.js";

import authService from "../service/authService.js";
import validate from "../../../shared/utils/validator.js";
import { APPLICATION_ROLES } from "../../../shared/constants/role.js";

/**
 * Super Admin Onboarding
 */
const onboardSuperAdmin = async (req, res) => {

    try {
        //validating all fields
        validate(req.body);

        // Body se data lo

        const { username, email, password } = req.body;

        // Super admin data
        const superAdminData = { username, email, password, role: APPLICATION_ROLES.SUPER_ADMIN };

        // Service call
        const result = await authService.onboardSuperAdmin(superAdminData);

        // Cookie set karo
        res.cookie("authToken", result.token, {
            httpOnly:
                config.cookie.httpOnly,
            secure:
                config.cookie.secure,
            maxAge:
                config.cookie.expiresIn,
            sameSite:
                config.cookie.secure ? "none" : "lax",
        }
        );

        // Response bhejo
        return res.status(201).json({
            success: true,
            message: "Super admin created successfully",
            data: result.user,
        });
    }

    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};

/**
 * Register User
 */
const registerUser = async (req, res) => {
    try {

        validate(req.body);

        const { username, email, password, role, clientId } = req.body;

        // User data
        const userData = {
            username, email, password, clientId,

            // Default role
            role: role || APPLICATION_ROLES.CLIENT_VIEWER
        };

        // Service call
        const result = await authService.registerUser(userData);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: result.user,
        });

    }

    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};


/**
 * Login User
 */
const loginUser = async (req, res) => {
    try {

        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required",
            });
        }

        // Service call
        const result = await authService.loginUser(username, password);

        // Cookie set
        res.cookie("authToken", result.token,
            {
                httpOnly:
                    config.cookie.httpOnly,

                secure:
                    config.cookie.secure,

                maxAge:
                    config.cookie.expiresIn,

                sameSite:
                    config.cookie.secure ? "none" : "lax",
            }
        );

        // Response
        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: result.user,
        });

    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};

/**
 * Get Logged In User Profile
 */
const getUserProfile = async (req, res) => {
    try {

        // Auth middleware se user id milegi
        const userId = req.user.userId;

        // Service call
        const user = await authService.getUserProfile(userId);

        // Response
        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: user,
        });

    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};

/**
 * Logout User
 */
const logoutUser = async (req, res) => {
    try {

        // Cookie remove karo
        res.clearCookie("authToken", {
            httpOnly: config.cookie.httpOnly,
            secure: config.cookie.secure,
            sameSite: config.cookie.secure ? "none" : "lax",
        });

        // Response
        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });

    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};

/**
 * Get All Users
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await authService.getAllUsers();
        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users,
        });
    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};

/**
 * Deactivate a User
 */
const deactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await authService.deactivateUser(userId);
        return res.status(200).json({
            success: true,
            message: "User deactivated successfully",
            data: user,
        });
    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Old and new password are required",
            });
        }

        const result = await authService.changePassword(userId, oldPassword, newPassword);
        return res.status(200).json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        const status =
            error.message.includes("not found") ? 404 :
                error.message.includes("Invalid credentials") || error.message.includes("incorrect") ? 401 :
                    error.message.includes("deactivated") || error.message.includes("Insufficient") ? 403 :
                        error.message.includes("already exists") || error.message.includes("disabled") ? 409 :
                            400;

        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }

};


export default {
    onboardSuperAdmin,
    registerUser,
    loginUser,
    getUserProfile,
    logoutUser,
    getAllUsers,
    deactivateUser,
    changePassword,
};