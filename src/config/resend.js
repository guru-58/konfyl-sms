import './env.js';
import { Resend } from 'resend';
import logger from '../utils/logger.js';

let resendClient = null;
const apiKey = process.env.RESEND_API_KEY;

const isMockEmail = !apiKey || apiKey === 're_your_api_key_here' || !apiKey.startsWith('re_');

if (!isMockEmail) {
  try {
    resendClient = new Resend(apiKey);
    logger.info('Resend API client initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize Resend client:', error);
  }
} else {
  logger.warn('RESEND_API_KEY is missing or invalid. Email Service will run in MOCK mode (emails logged to file/console instead of being sent).');
}

export const getResendClient = () => resendClient;
export const isMockEmailMode = () => isMockEmail;
export default resendClient;
