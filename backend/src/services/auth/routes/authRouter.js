import express from "express";
import authController from "../controller/authController.js";
import authenticateMiddleware from "../../../shared/middlewares/authenticateMiddleware.js";
import authoriseMiddleware from "../../../shared/middlewares/authoriseMiddleware.js";
import { APPLICATION_ROLES } from "../../../shared/constants/role.js";
import rateLimit from "express-rate-limit";

const authRouter = express.Router();

authRouter.post("/onboard-super-admin", authController.onboardSuperAdmin);
authRouter.post("/register",

    // Only logged-in users can access this route for first time the super admin can only register and after that only registered user can add new user to avoid spams
    authenticateMiddleware,
    authoriseMiddleware([APPLICATION_ROLES.SUPER_ADMIN]),
    authController.registerUser);



const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,  // Max 5 login attempts per 15 min per IP
    message: {
        success: false,
        message: "Too many login attempts, please try again later",
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
});
authRouter.post("/login", loginLimiter, authController.loginUser);
authRouter.get("/profile", authenticateMiddleware, authController.getUserProfile);
authRouter.post("/logout", authenticateMiddleware, authController.logoutUser);


// Super admin: get all users
authRouter.get(
    "/users",
    authenticateMiddleware,
    authoriseMiddleware([APPLICATION_ROLES.SUPER_ADMIN]),
    authController.getAllUsers
);

// Super admin: deactivate a user
authRouter.patch(
    "/users/:userId/deactivate",
    authenticateMiddleware,
    authoriseMiddleware([APPLICATION_ROLES.SUPER_ADMIN]),
    authController.deactivateUser
);

// Any logged-in user: change own password
authRouter.patch(
    "/change-password",
    authenticateMiddleware,
    authController.changePassword
);


export default authRouter;