import { Router } from 'express';
import { register, login, changePassword } from '../controllers/authController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', isAuthenticated, changePassword);

export default router;