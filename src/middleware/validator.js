import logger from '../utils/logger.js';

export const validateEnquiry = (req, res, next) => {
  const { fullName, phone, email, enquiryType, message, captchaToken } = req.body;
  const errors = {};

  // 1. Verify Cloudflare Turnstile token presence
  if (!captchaToken) {
    errors.captcha = 'Verification challenge is required';
  }

  // 2. Validate Full Name
  if (!fullName || typeof fullName !== 'string') {
    errors.fullName = 'Full Name is required';
  } else {
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.fullName = 'Full Name must not exceed 100 characters';
    }
  }

  // 3. Validate Email Address
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || typeof email !== 'string') {
    errors.email = 'Email address is required';
  } else {
    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    }
  }

  // 4. Validate Phone Number
  // Allows digits, spaces, hyphens, parentheses, and optional leading +
  const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
  if (!phone || typeof phone !== 'string') {
    errors.phone = 'Phone number is required';
  } else {
    const trimmedPhone = phone.trim();
    if (!phoneRegex.test(trimmedPhone)) {
      errors.phone = 'Please provide a valid phone number (minimum 10 digits)';
    }
  }

  // 5. Validate Enquiry Type
  const validTypes = ["Product Information", "Distribution / Business", "Healthcare Professional Query", "General Enquiry"];
  if (!enquiryType || typeof enquiryType !== 'string') {
    errors.enquiryType = 'Enquiry type is required';
  } else if (!validTypes.includes(enquiryType.trim())) {
    errors.enquiryType = 'Invalid enquiry type selected';
  }

  // 6. Validate Message
  if (!message || typeof message !== 'string') {
    errors.message = 'Message is required';
  } else {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      errors.message = 'Message must be at least 10 characters';
    } else if (trimmedMessage.length > 2000) {
      errors.message = 'Message must not exceed 2000 characters';
    }
  }

  // If there are errors, log and reject
  if (Object.keys(errors).length > 0) {
    logger.warn(`Validation failed for enquiry request: ${JSON.stringify(errors)}`);
    return res.status(400).json({ errors });
  }

  next();
};
