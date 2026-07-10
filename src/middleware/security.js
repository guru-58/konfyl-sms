import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import xss from 'xss';
import logger from '../utils/logger.js';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
});

const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const isLocalhost = origin && origin.startsWith('http://localhost:');
    const allowed = !origin || isLocalhost || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development';

    if (allowed) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-CSRF-Token']
});

export const requestLoggerMiddleware = (req, res, next) => {
  logger.info(`${req.ip} ${req.method} ${req.originalUrl}`);
  next();
};

export const enquiryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
});

export const nosqlInjectionPrevention = (req, res, next) => {
  const sanitize = obj => {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) {
          delete obj[key];
          logger.warn(`Blocked potential NoSQL injection key: ${key}`);
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};

export const xssSanitization = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = xss(value.trim());
      }
    }
  }
  next();
};

export const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled error in ${req.method} ${req.originalUrl}`, err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Blocked by CORS policy.' });
  }

  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
};
