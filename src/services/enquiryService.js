import { findTodaysEnquiryCount } from '../repositories/enquiryRepository.js';
import { sendEnquiryNotification, sendCustomerConfirmation } from './emailService.js';
import { verifyTurnstileToken } from './captchaService.js';
import prisma from '../config/database.js';

const generateEnquiryNumber = async () => {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10).replace(/-/g, '');
  const todayCount = await findTodaysEnquiryCount(dateKey);
  const sequence = String(todayCount + 1).padStart(5, '0');
  return `KNF-${dateKey}-${sequence}`;
};

export const processEnquirySubmission = async (payload) => {
  const captchaVerified = await verifyTurnstileToken(payload.captchaToken, payload.ipAddress);
  if (!captchaVerified) {
    const error = new Error('CAPTCHA verification failed.');
    error.status = 400;
    throw error;
  }

  const enquiryNumber = await generateEnquiryNumber();
  const storedEnquiry = await prisma.$transaction(async (tx) => {
    const createdEnquiry = await tx.enquiry.create({
      data: {
        enquiryNumber,
        name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        subject: payload.enquiryType,
        message: payload.message,
        status: 'PENDING'
      }
    });

    await tx.auditLog.create({
      data: {
        action: 'ENQUIRY_CREATED',
        details: `Enquiry created with number ${enquiryNumber}`,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent
      }
    });

    return createdEnquiry;
  });

  const emailPayload = {
    id: storedEnquiry.enquiryNumber,
    fullName: storedEnquiry.name,
    phone: storedEnquiry.phone,
    email: storedEnquiry.email,
    enquiryType: storedEnquiry.subject,
    message: storedEnquiry.message,
    createdAt: storedEnquiry.createdAt,
    ipAddress: payload.ipAddress,
    browser: payload.userAgent
  };

  Promise.allSettled([
    sendEnquiryNotification(emailPayload),
    sendCustomerConfirmation(emailPayload)
  ]).then((results) => {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Email send failed for ${index === 0 ? 'admin' : 'customer'}`, result.reason);
      }
    });
  });

  return storedEnquiry;
};
