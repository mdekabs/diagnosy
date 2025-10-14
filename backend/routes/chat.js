import { ChatController } from "../controllers/chat.js";
import { authenticationVerifier, optionalVerifier } from "../middleware/tokenization.js";
import { cacheMiddleware } from "../middleware/caching.js";

export default function chatRoutes(router) {
  // Create a chat for authenticated user
  router.post("/chat", authenticationVerifier, cacheMiddleware, ChatController.createChat);

  // Create a chat for guest user
  router.post("/chat/guest", optionalVerifier, cacheMiddleware, ChatController.createGuestChat);

  // Get chat history for authenticated user
  router.get("/chat/history", authenticationVerifier, cacheMiddleware, ChatController.getChatHistory);
}
