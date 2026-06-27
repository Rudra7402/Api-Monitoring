/**
 * Middleware to authorize requests based on user roles.
 * The roles allowed to access the route.
 * Returns a middleware function.
 * Throws an error if the user is not authorized.
 * This middleware checks if the authenticated user has the necessary role to access the route.
 * If the user does not have the required role, it responds with a 403 Forbidden status.
 * If the user is authorized, it calls the next middleware in the stack.
 */

const authoriseMiddleware = (allowedRoles = []) => (req, res, next) => {

    try {
        // Check karo user exist karta hai ya nahi
        if (!req.user || !req.user.role) {

            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }

        /**
         * Agar roles array empty hai
         * to sab allowed hain
         */
        if (allowedRoles.length === 0) {
            return next();
        }

        // User role allowed nahi hai
        if (!allowedRoles.includes(req.user.role)) {

            return res.status(403).json({
                success: false,
                message: "Insufficient permissions",
            });
        }

        // Authorized user
        next();
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }
};

export default authoriseMiddleware;