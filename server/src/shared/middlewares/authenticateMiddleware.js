import config from "../config/index.js";
import jwt from "jsonwebtoken";
import logger from "../config/logger.js"


/**
 * JWT Authentication Middleware
 * 
 * Ye middleware check karta hai:
 * 1. Cookie me token hai ya nahi
 * 2. Token valid hai ya nahi
 * 3. Valid user data req.user me add karta hai
 */
const authenticateMiddleware = async (req, res, next) => {
    try {
        let token = null;

        // Cookie se token lo
        if (req.cookies && req.cookies.authToken) {
            token = req.cookies.authToken;
        }

        // Token nahi mila
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required",
            });
        }

        // Token verify karo
        const decoded = jwt.verify(token, config.jwt.secret);

        /**
         * Token se user data nikalo
         * aur request me add kar do
         * 
         * Ab next middleware/controller me:
         * req.user available hoga
         */
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role,
            clientId: decoded.clientId,
        };

        // Next middleware/controller
        next();
    }
    catch (error) {

        logger.error("Authentication failed", {
            message: error.message,
            path: req.path,
        });

        // Token expire ho gaya
        if (error.name === "TokenExpiredError") {

            return res.status(401).json({
                success: false,
                message: "Token expired",
            });
        }

        // Invalid token
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};

export default authenticateMiddleware;