import express from 'express';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

const router = express.Router();

router.post('/users', UsersController.postNew);
router.get('/sign_in', AuthController.getConnect);
router.get('/sign_out', AuthController.getDisconnect);
router.get('/users/me', AuthController.getMe);

export default router;
