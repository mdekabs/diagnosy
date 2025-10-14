import { Router } from "express";
import authRoutes from "./authentication.js";
import chatRoutes from "./chat.js";

const router = Router();

// Mount authentication routes under /auth
authRoutes(router);

// Mount chat routes under /chat
chatRoutes(router);

export default router;
