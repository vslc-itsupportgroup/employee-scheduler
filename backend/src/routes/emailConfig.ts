import express from 'express';
import { getEmailConfig, updateEmailConfig, testEmailConfig } from '../controllers/emailConfigController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All email config routes require authentication and admin role
const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/', authenticateToken, adminOnly, getEmailConfig);
router.put('/', authenticateToken, adminOnly, updateEmailConfig);
router.post('/test', authenticateToken, adminOnly, testEmailConfig);

export default router;
