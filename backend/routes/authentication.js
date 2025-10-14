import { AuthController } from "../controllers/authentication.js";
import { authenticationVerifier } from "../middleware/tokenization.js";

export default function authRoutes(router) {
  // Generate guest ID and token
  router.post("/auth/guest", AuthController.generateGuestId);

  // Register a new user (optionally with guestId for history merging)
  router.post("/auth/register", AuthController.register);

  // Login a user (optionally with guestId for history merging)
  router.post("/auth/login", AuthController.login);

  // Logout a user (requires authentication)
  router.post("/auth/logout", authenticationVerifier, AuthController.logout);

  // Initiate password reset
  router.post("/auth/forgot-password", AuthController.forgotPassword);

  // Reset password with token
  router.post("/auth/reset-password", AuthController.resetPassword);
}
