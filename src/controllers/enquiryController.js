import { processEnquirySubmission } from '../services/enquiryService.js';
import logger from '../utils/logger.js';

export const submitEnquiry = async (req, res, next) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const enquiryPayload = {
      ...req.body,
      ipAddress,
      userAgent
    };

    const enquiry = await processEnquirySubmission(enquiryPayload);

    return res.status(201).json({
      success: true,
      message: 'Your enquiry has been submitted successfully.',
      data: { enquiryNumber: enquiry.enquiryNumber }
    });
  } catch (err) {
    logger.error('API Error in submitEnquiry:', err);
    next(err);
  }
};
