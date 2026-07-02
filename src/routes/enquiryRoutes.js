import express from 'express';
import { submitEnquiry } from '../controllers/enquiryController.js';
import { enquiryRateLimiter, nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';
import { validateEnquiry } from '../middleware/validator.js';

const router = express.Router();

// POST /api/enquiry - Create a new enquiry submission
router.post('/enquiry', 
  enquiryRateLimiter, 
  nosqlInjectionPrevention, 
  xssSanitization, 
  validateEnquiry, 
  submitEnquiry
);

export default router;
