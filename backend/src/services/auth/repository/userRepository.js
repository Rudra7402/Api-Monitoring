import User from "../../../shared/models/User.js";
import logger from "../../../shared/config/logger.js";

/**
 * Creates a new user in the database.
 */
const createUser = async (userData) => {
    try {
        let data = { ...userData };

        // Agar super_admin hai aur permissions nahi di hain, to default permissions de do
        if (data.role === "super_admin" && !data.permissions) {
            data.permissions = {
                canCreateApiKeys: true,
                canManageUsers: true,
                canViewAnalytics: true,
                canExportData: true,
            };
        }

        const user = new User(data);
        await user.save();

        logger.info("User created", { username: user.username });
        return user;
    }
    catch (error) {

        // MongoDB unique index violation (race condition case)
        // Example: two requests pass the existingUsername/existingEmail check simultaneously,
        // but one fails during save because username/email already exists in DB
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            throw new Error(`${field} already exists`);
        }
        logger.error("Error creating user", error);
        throw error;
    }

};

/**
 * Finds a user by their ID.
 */
const findUserById = async (userId) => {
    try {
        const user = await User.findById(userId);
        return user;
    } catch (error) {
        logger.error("Error finding user by id", error);
        throw error;
    }
};

/**
 * Finds a user by their username.
 */
const findUserByUsername = async (username) => {
    try {
        const user = await User.findOne({ username });
        return user;
    } catch (error) {
        logger.error("Error finding user by username", error);
        throw error;
    }
};

/**
 * Finds a user by their email.
 */
const findUserByEmail = async (email) => {
    try {
        const user = await User.findOne({ email });
        return user;
    } catch (error) {
        logger.error("Error finding user by email", error);
        throw error;
    }
};

/**
 * Finds all active users.
 */
const findAllActiveUsers = async () => {
    try {
        const users = await User.find({ isActive: true }).select("-password");
        return users;
    } catch (error) {
        logger.error("Error finding all active users", error);
        throw error;
    }
};

/**
 * Deactivates a user by their ID.
 */
const deactivateUser = async (userId) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { isActive: false },
            { new: true }
        ).select("-password");
        return user;
    } catch (error) {
        logger.error("Error deactivating user", error);
        throw error;
    }
};

/**
 * Updates a user's details by their ID.
 */
const updateUser = async (userId, updateData) => {
    try {
        const data = { ...updateData };

        // Prevent password from being updated through this generic helper
        delete data.password;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true, runValidators: true }
        ).select("-password");
        return user;
    } catch (error) {
        logger.error("Error updating user", error);
        throw error;
    }
};

/**
 * Finds all users (for super admin).
 */
const getAllUsers = async () => {
    try {
        const users = await User.find().select("-password");
        return users;
    } catch (error) {
        logger.error("Error getting all users", error);
        throw error;
    }
};

/**
 * Updates user password by ID.
 */
const updatePassword = async (userId, hashedPassword) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { password: hashedPassword },
            { new: true }
        ).select("-password");
        return user;
    } catch (error) {
        logger.error("Error updating password", error);
        throw error;
    }
};

const findUsersByClientId = async (clientId) => {
    try {
        return await User.find({ clientId }).select("-password");
    } catch (error) {
        logger.error("Error finding users by client", error);
        throw error;
    }
};



// In sabhi functions ko ek object ke roop me export kar diya gaya hai
export default {
    createUser,
    findUserById,
    findUserByUsername,
    findUserByEmail,
    findAllActiveUsers,
    deactivateUser,
    updateUser,
    getAllUsers,
    updatePassword,
    findUsersByClientId,
};
