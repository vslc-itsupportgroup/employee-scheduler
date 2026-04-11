import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getPasswordPolicy,
  updatePasswordPolicy,
  getUserPasswordStatus,
  forcePasswordChange,
  resetPasswordExpiry,
  getAllUsersPasswordStatus
} from '../controllers/passwordPolicyController';

const router = express.Router();

// Middleware: Only admins can access password policy endpoints
const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (user?.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can access password policy settings' });
  }
  next();
};

// Get password policy
router.get('/policy', authenticateToken, adminOnly, getPasswordPolicy);

// Update password policy
router.put('/policy', authenticateToken, adminOnly, updatePasswordPolicy);

// Get all users password status
router.get('/users/status', authenticateToken, adminOnly, getAllUsersPasswordStatus);

// Get specific user password status
router.get('/users/:userId/status', authenticateToken, adminOnly, getUserPasswordStatus);

// Force password change for user
router.post('/users/:userId/force-change', authenticateToken, adminOnly, forcePasswordChange);

// Reset password expiry for user
router.post('/users/:userId/reset-expiry', authenticateToken, adminOnly, resetPasswordExpiry);

export default router;
