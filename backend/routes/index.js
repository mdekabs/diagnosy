import express from 'express';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import ChatController from "../controllers/ChatController";
import Pagination from '../middleware/_pagination';

const router = express.Router();

// Route Paths
const ROUTES = {
  USERS: '/users',
  SIGN_IN: '/sign_in',
  SIGN_OUT: '/sign_out',
  ME: '/users/me',
  CHATS: '/chats',
  STATUS: '/status',
};

// User Routes
router.post(ROUTES.USERS, UsersController.postNew);
router.post(ROUTES.SIGN_IN, AuthController.getConnect);
router.get(ROUTES.SIGN_OUT, AuthController.getDisconnect);
router.get(ROUTES.ME, AuthController.getMe);

// Chat Routes
router.post(ROUTES.CHATS, ChatController.createChat);
router.get(ROUTES.CHATS, Pagination, ChatController.getChatHistory);

// Status Route
router.get(ROUTES.STATUS, async (req, res) => {
  res.status(200).json({ status: "Green", message: "Daisy says hi" });
});

export default router;
