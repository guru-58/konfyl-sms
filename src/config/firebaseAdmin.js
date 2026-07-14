import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

let db;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let serviceAccount = null;

  if (serviceAccountJson) {
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseErr) {
      logger.error('CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON as JSON.', parseErr);
      process.exit(1);
    }
  } else if (serviceAccountPath) {
    try {
      const resolvedPath = path.resolve(serviceAccountPath);
      if (fs.existsSync(resolvedPath)) {
        const raw = fs.readFileSync(resolvedPath, 'utf8');
        serviceAccount = JSON.parse(raw);
        logger.info(`Loaded Firebase credentials from file: ${resolvedPath}`);
      } else {
        logger.error(`CRITICAL: Credentials file not found at: ${resolvedPath}`);
        process.exit(1);
      }
    } catch (err) {
      logger.error(`CRITICAL: Failed to read/parse credentials file at ${serviceAccountPath}:`, err);
      process.exit(1);
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !serviceAccount) {
    logger.error('CRITICAL: Firebase service account credentials (FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_PATH) are missing in production.');
    process.exit(1);
  }

  // Fallback to emulator in development if no credential or host is configured
  if (!isProd && !serviceAccount && !process.env.FIRESTORE_EMULATOR_HOST) {
    logger.warn('[Firebase Admin] No FIRESTORE_EMULATOR_HOST or credentials found. Defaulting FIRESTORE_EMULATOR_HOST to "localhost:8080".');
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  }

  let app;
  if (getApps().length === 0) {
    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      logger.info('Firebase Admin SDK initialized using service account credential.');
    } else {
      // Local development fallback
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'konfyl-pharmaceutical';
      app = initializeApp({
        projectId: projectId
      });
      logger.info(`Firebase Admin SDK initialized for project ${projectId} (Local Dev Fallback/ADC).`);
    }
  } else {
    app = getApps()[0];
  }

  // Lazily initialize firestore to prevent boot-time crashes on imports
  let lazyDb = null;
  const getLazyDb = () => {
    if (!lazyDb) {
      lazyDb = getFirestore(app);
      lazyDb.settings({ ignoreUndefinedProperties: true });
    }
    return lazyDb;
  };

  db = new Proxy({}, {
    get(target, prop) {
      return getLazyDb()[prop];
    }
  });
} catch (err) {
  logger.error('CRITICAL: Error initializing Firebase Admin SDK:', err);
  process.exit(1);
}

export { db };
