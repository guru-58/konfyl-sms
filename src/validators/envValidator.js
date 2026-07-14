import logger from '../utils/logger.js';

export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];

  // Validate JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  const defaultSecret = 'konfyl-jwt-default-secret-key-98765';

  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is missing.');
  } else if (jwtSecret === defaultSecret) {
    if (isProd) {
      errors.push('JWT_SECRET is set to the default insecure placeholder. You must set a unique, strong key in production.');
    }
  } else if (jwtSecret.length < 32) {
    if (isProd) {
      errors.push('JWT_SECRET is too weak (must be at least 32 characters in production).');
    }
  }

  // Validate Firebase credentials in production
  if (isProd) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      errors.push('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is missing in production.');
    } else {
      try {
        JSON.parse(serviceAccountJson);
      } catch (err) {
        errors.push('FIREBASE_SERVICE_ACCOUNT_JSON is not a valid JSON string.');
      }
    }
  }

  // Validate APP_TIMEZONE
  const appTimezone = process.env.APP_TIMEZONE;
  if (!appTimezone) {
    errors.push('APP_TIMEZONE environment variable is missing.');
  } else {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: appTimezone });
    } catch (err) {
      errors.push(`APP_TIMEZONE is set to an invalid timezone: "${appTimezone}".`);
    }
  }

  if (errors.length > 0) {
    logger.error('CRITICAL: Startup environment validation failed with the following errors:');
    errors.forEach((err) => logger.error(`  - ${err}`));
    process.exit(1);
  }

  logger.info('Startup environment validation passed successfully.');
}
