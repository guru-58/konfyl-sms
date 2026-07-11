import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import xss from 'xss';
import logger from '../utils/logger.js';

// 1. Helmet Middleware Config
export const helmetMiddleware = helmet();

// 2. CORS Middleware Config
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = Array.isArray(process.env.CORS_ORIGIN)
  ? process.env.CORS_ORIGIN
  : String(process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const isLocalHost = origin && origin.startsWith('http://localhost:');
    const isAllowed = !origin || allowedOrigins.includes(origin) || isLocalHost || process.env.NODE_ENV === 'development';

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-CSRF-Token'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
});

// 3. Rate Limiter for Enquiry endpoint (max 5 requests per 15 minutes per IP)
export const enquiryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { 
    error: 'Too many enquiry submissions from this IP. Please try again after 15 minutes.' 
  },
  standardHeaders: true, 
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// 4. NoSQL Injection Prevention Middleware
export const nosqlInjectionPrevention = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$')) {
          logger.warn(`NoSQL Injection Attempt Blocked. Key: ${key} deleted.`);
          delete obj[key];
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

// 5. Input Sanitization (XSS Prevention) Middleware
export const xssSanitization = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Trim whitespace first
        req.body[key] = req.body[key].trim();
        // Strip out HTML tags to prevent cross site scripting
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
};
