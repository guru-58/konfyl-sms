import express from 'express';
import { submitEnquiry } from '../controllers/enquiryController.js';
import { enquiryRateLimiter, nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';
import { validateSchema, enquirySchema } from '../middleware/validator.js';

const router = express.Router();

router.post('/',
  enquiryRateLimiter,
  nosqlInjectionPrevention,
  xssSanitization,
  validateSchema(enquirySchema),
  submitEnquiry
);

export default router;
