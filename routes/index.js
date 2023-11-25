import express from 'express';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import ChatController from "../controllers/ChatController";

const router = express.Router();

router.post('/users', UsersController.postNew);
router.get('/sign_in', AuthController.getConnect);
router.get('/sign_out', AuthController.getDisconnect);
router.get('/users/me', AuthController.getMe);
router.get("/chats", ChatController.handleChat);

export default router;
