import { verifyTurnstileToken } from '../services/captchaService.js';
import { generateEnquiryId } from '../utils/idGenerator.js';
import { sendEnquiryNotification, sendCustomerConfirmation } from '../services/emailService.js';
import logger from '../utils/logger.js';

export const submitEnquiry = async (req, res) => {
  const { fullName, phone, email, enquiryType, message, captchaToken } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const browser = req.headers['user-agent'] || 'Unknown';

  try {
    logger.info(`Received enquiry request from ${email}`);

    // 1. Spam Prevention Verification (Disabled)

    // 2. Generate Unique Enquiry ID (e.g. KNF-20260702-00001)
    const enquiryId = await generateEnquiryId();
    logger.info(`Generated Enquiry ID: ${enquiryId}`);

    // 3. Build Enquiry Data Object (Skipping database storage as requested)
    const enquiryData = {
      id: enquiryId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      enquiryType: enquiryType.trim(),
      message: message.trim(),
      status: 'New',
      ipAddress,
      browser
    };

    logger.info(`Database storage is disabled. Bypassing database write for ID: ${enquiryId}`);

    // 4. Trigger Emails Asynchronously to speed up HTTP response
    // We run them in background but handle errors properly
    Promise.allSettled([
      sendEnquiryNotification(enquiryData),
      sendCustomerConfirmation(enquiryData)
    ]).then((results) => {
      const adminEmailResult = results[0];
      const customerEmailResult = results[1];

      if (adminEmailResult.status === 'fulfilled') {
        logger.info(`Admin notification email successfully dispatched for ${enquiryId}.`);
      } else {
        logger.error(`Admin notification email failed for ${enquiryId}.`, adminEmailResult.reason);
      }

      if (customerEmailResult.status === 'fulfilled') {
        logger.info(`Customer auto-reply email successfully dispatched for ${enquiryId}.`);
      } else {
        logger.error(`Customer confirmation email failed for ${enquiryId}.`, customerEmailResult.reason);
      }
    });

    // 5. Respond to client immediately with generated Enquiry ID
    return res.status(201).json({
      success: true,
      message: 'Your enquiry has been submitted successfully.',
      id: enquiryId
    });

  } catch (err) {
    logger.error('API Error in submitEnquiry:', err);
    return res.status(500).json({
      error: 'An internal server error occurred while processing your request. Please try again later.'
    });
  }
};
