import firebaseApp from '../config/firebase.js';
import logger from '../utils/logger.js';

const auth = firebaseApp?.auth?.();

// DEV BYPASS: When DEV_AUTH_BYPASS=true, skip token verification
// This mirrors the CAPTCHA bypass pattern for local development
const DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS === 'true' || process.env.NODE_ENV !== 'production';

export const verifyFirebaseToken = async (req, res, next) => {
  if (DEV_AUTH_BYPASS) {
    logger.warn('[DEV] Auth token verification bypassed. Set NODE_ENV=production to enforce token auth.');
    req.user = {
      uid: 'dev-bypass-uid',
      email: req.headers['x-dev-user-email'] || 'dev@konfylpharma.com',
      role: req.headers['x-dev-user-role'] || 'SUPER_ADMIN'
    };
    return next();
  }

  if (!auth) {
    return res.status(500).json({ error: 'Firebase authentication is not configured.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'USER'
    };
    next();
  } catch (error) {
    logger.warn('Firebase token verification failed.', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (allowedRoles = []) => (req, res, next) => {
  if (DEV_AUTH_BYPASS) return next(); // Skip role check in dev bypass mode
  const userRole = req.user?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: 'You do not have permission to access this resource.' });
  }
  next();
};
