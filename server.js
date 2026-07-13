import './src/config/env.js';
import { validateEnv } from './src/validators/envValidator.js';
// Run environment validation on startup
validateEnv();

import express from 'express';
import logger from './src/utils/logger.js';
import { corsMiddleware, helmetMiddleware } from './src/middleware/security.js';
import enquiryRoutes from './src/routes/enquiryRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import examRoutes from './src/routes/examRoutes.js';
import resultRoutes from './src/routes/resultRoutes.js';
import publicProductRoutes from './src/routes/publicProductRoutes.js';
import adminProductRoutes from './src/routes/adminProductRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enquiries are processed in-memory and sent via email. No database storage is configured.

// 2. Global Express Security & Utility Middlewares
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' })); // Limits request body size for security
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Force browser to not cache dynamic API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 3. Register API Routes
app.use('/api', enquiryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/public', publicProductRoutes);
app.use('/api/admin', adminProductRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 4. Handle 404 Route Not Found
app.use((req, res, next) => {
  logger.warn(`404 Route Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found.' });
});

// 5. Global Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled Exception on ${req.method} ${req.originalUrl} from IP: ${req.ip}:`, err);
  
  // CORS library throws errors we can intercept
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Blocked by CORS policy.' });
  }

  res.status(500).json({ 
    error: 'An unexpected database or application error occurred.' 
  });
});

// 6. Listen for Incoming Connections
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`Server successfully listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });

  // Handle graceful shutdown signals
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received. Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });
}

export default app;
