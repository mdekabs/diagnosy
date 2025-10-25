import { Router } from "express";
import authRoutes from "./authentication.js";
import chatRoutes from "./chat.js";

const router = Router();
authRoutes(router);
chatRoutes(router);

export default router;
