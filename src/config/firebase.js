import admin from 'firebase-admin';
import logger from '../utils/logger.js';

const firebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!firebaseCredentials) {
  logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not configured. Firebase authentication will not initialize.');
}

let firebaseApp;
try {
  firebaseApp = admin.initializeApp({
    credential: firebaseCredentials
      ? admin.credential.cert(JSON.parse(firebaseCredentials))
      : admin.credential.applicationDefault()
  });
  logger.info('Firebase Admin initialized successfully.');
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK.', error);
}

export default firebaseApp;
