import express from 'express';
import { register, login, getCurrentUser, demoLogin, changePassword, requestPasswordReset, verifyPasswordResetCode, resetPassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', changePassword);
router.post('/forgot-password/request', requestPasswordReset);
router.post('/forgot-password/verify-code', verifyPasswordResetCode);
router.post('/forgot-password/reset', resetPassword);
router.post('/demo-login', demoLogin);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
