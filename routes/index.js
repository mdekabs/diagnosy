import express from 'express';
import UsersController from '../user/UsersController';
// import AuthController from '../user/AuthController';

const router = express.Router();

router.post('/users', UsersController.postNew);
// router.get('/sign_in', AuthController.getConnect);
// router.get('/sign_out', AuthController.getDisconnect);
// router.get('/users/me', AuthController.getMe);

export default router;
