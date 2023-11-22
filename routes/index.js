import express from 'express';
import UsersController from '../user/UsersController';
// import AuthController from '../user/AuthController';

const router = express.Router();

router.post('/users', UsersController.postNew);
// router.get('/connect', AuthController.getConnect);
// router.get('/disconnect', AuthController.getDisconnect);
// router.get('/users/me', AuthController.getMe);

export default router;
