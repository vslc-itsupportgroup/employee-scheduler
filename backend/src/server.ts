import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import emailService from './services/emailService';
import emailConfirmationService from './services/emailConfirmationService';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedules';
import changeRequestRoutes from './routes/changeRequests';
import approvalRoutes from './routes/approvals';
import userRoutes from './routes/users';
import auditRoutes from './routes/audit';
import shiftRoutes from './routes/shifts';
import emailConfigRoutes from './routes/emailConfig';
import securityRoutes from './routes/security';
import passwordPolicyRoutes from './routes/passwordPolicy';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/change-requests', changeRequestRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/email-config', emailConfigRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/password-policy', passwordPolicyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize email service
  try {
    await emailService.loadConfig();
    console.log('Email service initialized successfully');
  } catch (error) {
    console.warn('Email service initialization failed:', error);
    console.warn('Email notifications may not work. Configure email settings via /api/email-config');
  }

  // Setup periodic cleanup of expired confirmation codes (every 5 minutes)
  setInterval(async () => {
    try {
      await emailConfirmationService.cleanupExpiredCodes();
    } catch (error) {
      console.error('Error in cleanup task:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('✓ Expired confirmation code cleanup scheduled (runs every 5 minutes)');
});
