import logger from '../utils/logger.js';

export const verifyTurnstileToken = async (token, ip = '') => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!token) {
    logger.warn('Spam Prevention: Captcha token is missing.');
    return false;
  }

  // If using Cloudflare's always-pass testing secret key, we verify it normally.
  // In case the API is inaccessible, we check if it is the testing key and allow it.
  if (!secretKey || secretKey === 'your_cloudflare_turnstile_secret_key') {
    logger.warn('TURNSTILE_SECRET_KEY is missing or unconfigured. Skipping CAPTCHA verification in development.');
    return true; // Allow in local development without keys
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip
      })
    });

    const result = await response.json();

    if (result.success) {
      logger.info('Captcha verification successful (Turnstile).');
      return true;
    } else {
      logger.warn(`Captcha verification failed. Errors: ${JSON.stringify(result['error-codes'])}`);
      return false;
    }
  } catch (err) {
    logger.error('Error contacting Cloudflare Turnstile API. Failing open if using test keys...', err);
    if (secretKey.startsWith('1x000000')) {
      logger.warn('Turnstile API failed, but test keys are in use. Allowing submission.');
      return true;
    }
    return false;
  }
};
