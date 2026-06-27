import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import config from "../../../shared/config/index.js";
import logger from "../../../shared/config/logger.js";

import { APPLICATION_ROLES } from "../../../shared/constants/role.js";

import userRepository from "../repository/userRepository.js";
import { findClientById } from "../../client/repository/ClientRepository.js";

/**
 * JWT token generate karta hai
 */
const generateToken = (user) => {
    const payload = {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
    };

    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
};

/**
 * User response se password remove karta hai
 */
const formatUser = (user) => {
    const userObj = user.toObject();

    delete userObj.password;

    return userObj;
};

/**
 * Super Admin Create
 */
const onboardSuperAdmin = async (superAdminData) => {
    try {


        // Check if any user (active or deactivated) already exists in the database
        const existingUsers = await userRepository.getAllUsers();

        if (existingUsers.length > 0) {
            throw new Error("Super admin onboarding is disabled");
        }


        // Hash password
        const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
        const adminData = {
            ...superAdminData,
            password: hashedPassword,
        };

        // Super admin create karo
        const user = await userRepository.createUser(adminData);

        // Token generate karo
        const token = generateToken(user);

        logger.info("Super admin created", {
            username: user.username,
        });

        return {
            user: formatUser(user),
            token,
        };
    } catch (error) {
        logger.error(
            "Error onboarding super admin",
            error
        );

        throw error;
    }
};

/**
 * User Register
 */
const registerUser = async (userData) => {
    try {
        // Username check

        // Prevent anyone from self-assigning super_admin role
        if (userData.role === APPLICATION_ROLES.SUPER_ADMIN) {
            throw new Error("Cannot assign super_admin role");
        }

        // client_admin and client_viewer must have a clientId
        if (userData.role !== APPLICATION_ROLES.SUPER_ADMIN && !userData.clientId) {
            throw new Error("clientId is required for client roles");
        }

        const client = await findClientById(userData.clientId);

        if (!client) {
            throw new Error("Client does not exist");
        }

        const existingUsername = await userRepository.findUserByUsername(userData.username);

        if (existingUsername) {
            throw new Error("Username already exists");
        }

        // Email check
        const existingEmail = await userRepository.findUserByEmail(userData.email);

        if (existingEmail) {
            throw new Error("Email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const newUser = {
            ...userData,
            password: hashedPassword,
        };

        // User create
        const user = await userRepository.createUser(newUser);


        logger.info("User registered", {
            username: user.username,
        });

        return {
            user: formatUser(user),
        };
    } catch (error) {
        logger.error(
            "Error registering user",
            error
        );

        throw error;
    }
};

/**
 * User Login
 */
const loginUser = async (username, password) => {
    try {
        // Username se user find karo
        const user = await userRepository.findUserByUsername(username);

        // User nahi mila
        if (!user) {
            throw new Error(
                "Invalid credentials"
            );
        }

        // Account inactive hai
        if (!user.isActive) {
            throw new Error(
                "Account is deactivated"
            );
        }

        // Password compare
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        // Password incorrect
        if (!isPasswordCorrect) {
            throw new Error(
                "Invalid credentials"
            );
        }

        // Token generate
        const token = generateToken(user);

        logger.info("User logged in", {
            username: user.username,
        });

        return {
            user: formatUser(user),
            token,
        };
    } catch (error) {
        logger.error(
            "Error logging in user",
            error
        );

        throw error;
    }
};

/**
 * User Profile
 */
const getUserProfile = async (userId) => {
    try {
        const user = await userRepository.findUserById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        return formatUser(user);
    }

    catch (error) {
        logger.error("Error getting user profile", error);

        throw error;
    }
};

/**
 * Super Admin Permission Check
 */
const checkSuperAdminPermissions = async (userId) => {

    try {
        const user = await userRepository.findUserById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        return (user.role === APPLICATION_ROLES.SUPER_ADMIN);
    }

    catch (error) {
        logger.error("Error checking super admin permissions", error);

        throw error;
    }
};


/**
 * Get All Users (Super Admin only)
 */
const getAllUsers = async () => {
    try {
        const users = await userRepository.getAllUsers();
        return users;
    } catch (error) {
        logger.error("Error getting all users", error);
        throw error;
    }
};

/**
 * Deactivate a User
 */
const deactivateUser = async (userId) => {
    try {
        const user = await userRepository.findUserById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        if (user.role === APPLICATION_ROLES.SUPER_ADMIN) {
            throw new Error("Cannot deactivate super admin");
        }

        const updated = await userRepository.deactivateUser(userId);
        return updated;
    } catch (error) {
        logger.error("Error deactivating user", error);
        throw error;
    }
};

/**
 * Change Password
 */
const changePassword = async (userId, oldPassword, newPassword) => {
    try {
        const user = await userRepository.findUserById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new Error("Old password is incorrect");
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userRepository.updatePassword(userId, hashedPassword);

        logger.info("Password changed", { userId });

        return { message: "Password changed successfully" };
    } catch (error) {
        logger.error("Error changing password", error);
        throw error;
    }
};


export default {
    onboardSuperAdmin,
    registerUser,
    loginUser,
    getUserProfile,
    checkSuperAdminPermissions,
    getAllUsers,
    deactivateUser,
    changePassword,
};