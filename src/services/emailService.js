import { getResendClient, isMockEmailMode } from '../config/resend.js';
import logger from '../utils/logger.js';

// Configuration Object for Brand assets and contact info
export const emailConfig = {
  companyName: 'KONFYL Pharmaceutical Pvt Ltd',
  tagline: 'Trusted Quality. Better Care.',
  logoUrl: process.env.EMAIL_LOGO_URL || 'https://konfyl.com/images/previews/page2.png',
  website: 'https://konfyl.com',
  email: 'info@konfyl.com',
  phone: '+91 9307354558',
  corporateAddress: 'A-710, Jagannath Galaxy, Talpada, Badlapur E.D., Ambarnath, Thane - 421503, Maharashtra',
  registeredAddress: 'Shop No. 17 Malmatta No. VR17/667/437, Sumit Greendale Chikal Dongari Road Global City, Virar West, Dist- Palghar-401303',
  googleMapsLink: 'https://maps.google.com/?q=KONFYL+Pharmaceutical+Pvt+Ltd',
  socialLinks: {
    instagram: 'https://www.instagram.com/konfylpharmaceutical/',
    facebook: 'https://facebook.com',
    linkedin: 'https://linkedin.com',
    youtube: 'https://youtube.com'
  }
};

const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const infoEmail = process.env.EMAIL_TO || emailConfig.email;

// Helper: Try to send email with a one-time retry if it fails
const sendEmailWithRetry = async (emailOptions, description) => {
  const isMock = isMockEmailMode();

  if (isMock) {
    logger.info(`[MOCK EMAIL] [${description}] Logging email options instead of sending:`);
    logger.info(`From: ${emailOptions.from}`);
    logger.info(`To: ${emailOptions.to}`);
    logger.info(`Subject: ${emailOptions.subject}`);
    logger.info(`HTML Content Preview: \n${emailOptions.html.substring(0, 500)}...\n[Truncated Preview]`);
    return { success: true, message: 'Mock email logged successfully' };
  }

  const resend = getResendClient();
  const sendCall = async () => {
    const response = await resend.emails.send(emailOptions);
    if (response.error) {
      throw new Error(response.error.message || JSON.stringify(response.error));
    }
    return response;
  };

  try {
    const data = await sendCall();
    logger.info(`[EMAIL SUCCESS] [${description}] Email sent to ${emailOptions.to}. ID: ${data.data?.id}`);
    return data;
  } catch (err) {
    logger.warn(`[EMAIL WARN] [${description}] Failed to send email to ${emailOptions.to}. Error: ${err.message}. Retrying once in 1.5s...`);
    
    // Wait 1.5 seconds
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const data = await sendCall();
      logger.info(`[EMAIL SUCCESS] [${description}] (RETRY) Email sent to ${emailOptions.to}. ID: ${data.data?.id}`);
      return data;
    } catch (retryErr) {
      logger.error(`[EMAIL ERROR] [${description}] Retry failed. Failed to send email to ${emailOptions.to}. Error: ${retryErr.message}`, retryErr);
      throw retryErr;
    }
  }
};

// Helper to generate the email header block
const generateHeader = (title, subtitle) => `
  <!-- Outer Container Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; width: 100%;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(15, 76, 129, 0.05); border-collapse: separate;">
          
          <!-- Gradient Top Accent Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #0F4C81 0%, #1F6FEB 100%); height: 6px; font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>
          
          <!-- Brand Header Banner -->
          <tr>
            <td align="center" style="padding: 32px 24px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="${emailConfig.website}" target="_blank" style="text-decoration: none;">
                      <img src="${emailConfig.logoUrl}" alt="${emailConfig.companyName}" width="150" style="display: block; max-width: 150px; height: auto; border: 0;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h2 style="color: #0F4C81; font-size: 20px; font-weight: 700; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.02em;">
                      ${emailConfig.companyName}
                    </h2>
                    <p style="color: #64748b; font-size: 12px; font-weight: 600; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.1em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${emailConfig.tagline}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Hero Banner Section -->
          <tr>
            <td align="center" style="background-color: #f0f7ff; padding: 24px; text-align: center; border-bottom: 1px solid #e0f2fe;">
              <h1 style="color: #0F4C81; font-size: 22px; font-weight: 700; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.02em;">
                ${title}
              </h1>
              ${subtitle ? `<p style="color: #1f6feb; font-size: 14px; margin: 6px 0 0 0; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${subtitle}</p>` : ''}
            </td>
          </tr>
          
          <!-- Medical Cross Themed Divider -->
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 12px 0 0 0; font-size: 16px; color: #0F4C81; font-weight: bold;">
              ✚
            </td>
          </tr>
`;

// Helper to generate the "Why KONFYL" Section
const generateWhyKonfylSection = () => `
          <!-- Why KONFYL Section -->
          <tr>
            <td style="padding: 32px 24px; background-color: #ffffff; border-top: 1px solid #f1f5f9;">
              <h3 style="font-size: 16px; color: #0F4C81; margin: 0 0 20px 0; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Why KONFYL
              </h3>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Card 1: Trusted Quality -->
                  <td width="50%" class="why-konfyl-card" style="padding: 0 10px 20px 0; vertical-align: top;">
                    <table border="0" cellpadding="16" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; height: 100%;">
                      <tr>
                        <td>
                          <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
                          <div style="font-weight: 700; color: #0F4C81; font-size: 14px; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Trusted Quality</div>
                          <div style="color: #64748b; font-size: 12px; line-height: 1.5; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            WHO-GMP certified production and premium global standards.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Card 2: Innovation -->
                  <td width="50%" class="why-konfyl-card" style="padding: 0 0 20px 10px; vertical-align: top;">
                    <table border="0" cellpadding="16" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; height: 100%;">
                      <tr>
                        <td>
                          <div style="font-size: 24px; margin-bottom: 8px;">🔬</div>
                          <div style="font-weight: 700; color: #0F4C81; font-size: 14px; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Innovation</div>
                          <div style="color: #64748b; font-size: 12px; line-height: 1.5; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Advanced formulation technologies for superior clinical efficacy.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <!-- Card 3: Patient First -->
                  <td width="50%" class="why-konfyl-card" style="padding: 0 10px 0 0; vertical-align: top;">
                    <table border="0" cellpadding="16" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; height: 100%;">
                      <tr>
                        <td>
                          <div style="font-size: 24px; margin-bottom: 8px;">❤️</div>
                          <div style="font-weight: 700; color: #0F4C81; font-size: 14px; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Patient First</div>
                          <div style="color: #64748b; font-size: 12px; line-height: 1.5; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Dedicated to accessible, high-quality, patient-centric care.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Card 4: Research Driven -->
                  <td width="50%" class="why-konfyl-card" style="padding: 0 0 0 10px; vertical-align: top;">
                    <table border="0" cellpadding="16" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; height: 100%;">
                      <tr>
                        <td>
                          <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                          <div style="font-weight: 700; color: #0F4C81; font-size: 14px; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Research Driven</div>
                          <div style="color: #64748b; font-size: 12px; line-height: 1.5; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Evidence-backed healthcare products designed with leading clinicians.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`;

// Helper to generate the email footer block
const generateFooter = () => `
          <!-- Premium Brand Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 32px 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- About KONFYL -->
                <tr>
                  <td style="padding-bottom: 24px; text-align: center;">
                    <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #0F4C81; margin: 0 0 8px 0; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      About KONFYL
                    </h4>
                    <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0; max-width: 480px; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      KONFYL Pharmaceutical Pvt Ltd is committed to delivering trusted healthcare solutions across Women's Wellness, Nutraceuticals and General Medicine through innovation, quality and patient-centric care.
                    </p>
                  </td>
                </tr>
                
                <!-- Healthcare Certifications / Badges -->
                <tr>
                  <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #64748b; padding-right: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Standards:</td>
                        <td style="padding: 0 6px;"><span style="background-color: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">WHO-GMP</span></td>
                        <td style="padding: 0 6px;"><span style="background-color: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">ISO 9001:2015</span></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Office Addresses -->
                <tr>
                  <td style="padding: 24px 0 16px 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="50%" style="vertical-align: top; padding-right: 12px; font-size: 11px; line-height: 1.5; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          <strong style="color: #334155; display: block; margin-bottom: 4px; font-size: 12px;">Corporate Office:</strong>
                          ${emailConfig.corporateAddress}
                        </td>
                        <td width="50%" style="vertical-align: top; padding-left: 12px; font-size: 11px; line-height: 1.5; color: #64748b; border-left: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          <strong style="color: #334155; display: block; margin-bottom: 4px; font-size: 12px;">Registered Office:</strong>
                          ${emailConfig.registeredAddress}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Direct Contact Details -->
                <tr>
                  <td align="center" style="padding-bottom: 20px; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <span style="margin: 0 8px; display: inline-block;">📞 <a href="tel:${emailConfig.phone}" style="color: #0F4C81; text-decoration: none; font-weight: 600;">${emailConfig.phone}</a></span>
                    <span style="margin: 0 8px; display: inline-block;">✉️ <a href="mailto:${emailConfig.email}" style="color: #0F4C81; text-decoration: none; font-weight: 600;">${emailConfig.email}</a></span>
                    <span style="margin: 0 8px; display: inline-block;">🌐 <a href="${emailConfig.website}" target="_blank" style="color: #0F4C81; text-decoration: none; font-weight: 600;">konfyl.com</a></span>
                  </td>
                </tr>
                
                <!-- Social Icons -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- LinkedIn -->
                        <td style="padding: 0 8px;">
                          <a href="${emailConfig.socialLinks.linkedin}" target="_blank" style="text-decoration: none;">
                            <img src="https://img.icons8.com/ios-filled/40/0f4c81/linkedin.png" alt="LinkedIn" width="20" height="20" style="display: block; width: 20px; height: 20px; border: 0;" />
                          </a>
                        </td>
                        <!-- Instagram -->
                        <td style="padding: 0 8px;">
                          <a href="${emailConfig.socialLinks.instagram}" target="_blank" style="text-decoration: none;">
                            <img src="https://img.icons8.com/ios-filled/40/0f4c81/instagram-new.png" alt="Instagram" width="20" height="20" style="display: block; width: 20px; height: 20px; border: 0;" />
                          </a>
                        </td>
                        <!-- Facebook -->
                        <td style="padding: 0 8px;">
                          <a href="${emailConfig.socialLinks.facebook}" target="_blank" style="text-decoration: none;">
                            <img src="https://img.icons8.com/ios-filled/40/0f4c81/facebook-new.png" alt="Facebook" width="20" height="20" style="display: block; width: 20px; height: 20px; border: 0;" />
                          </a>
                        </td>
                        <!-- YouTube -->
                        <td style="padding: 0 8px;">
                          <a href="${emailConfig.socialLinks.youtube}" target="_blank" style="text-decoration: none;">
                            <img src="https://img.icons8.com/ios-filled/40/0f4c81/youtube-play.png" alt="YouTube" width="20" height="20" style="display: block; width: 20px; height: 20px; border: 0;" />
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Legal Footer -->
                <tr>
                  <td align="center" style="font-size: 11px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    &copy; ${new Date().getFullYear()} KONFYL Pharmaceutical Pvt Ltd. All rights reserved.<br />
                    <a href="${emailConfig.website}/privacy" target="_blank" style="color: #64748b; text-decoration: underline; margin-right: 8px;">Privacy Policy</a>
                    <a href="${emailConfig.website}/terms" target="_blank" style="color: #64748b; text-decoration: underline; margin-left: 8px;">Terms of Service</a>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
        </table> <!-- End Main Email Container -->
      </td>
    </tr>
  </table> <!-- End Outer Container Table -->
`;

/**
 * 1. Complete Admin HTML email template
 */
export const generateAdminEmail = (enquiry) => {
  const submittedAt = new Date(enquiry.createdAt || new Date()).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Website Enquiry Received | KONFYL</title>
    <style type="text/css">
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; }
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: none !important;
        font-size: inherit !important;
        font-family: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
      }
      @media screen and (max-width: 600px) {
        .why-konfyl-card {
          display: block !important;
          width: 100% !important;
          padding-right: 0 !important;
          padding-left: 0 !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc;">
    ${generateHeader('New Website Enquiry Received', 'A visitor has submitted a new enquiry through the KONFYL website.')}
    
    <!-- Main Content Body -->
    <tr>
      <td style="padding: 32px 24px; background-color: #ffffff;">
        <p style="font-size: 15px; color: #334155; margin-top: 0; margin-bottom: 20px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Hello Admin,
        </p>
        <p style="font-size: 15px; color: #334155; margin-top: 0; margin-bottom: 24px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          A new customer enquiry has been captured via the company website. Below are the submission details:
        </p>
        
        <!-- Details Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border-collapse: separate;">
          
          <!-- Card Header -->
          <tr>
            <td style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 20px;">
              <strong style="color: #0F4C81; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Enquiry Information</strong>
            </td>
          </tr>
          
          <!-- Card Rows -->
          <tr>
            <td style="padding: 16px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Enquiry ID -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">🆔</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Enquiry ID</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0F4C81; font-size: 14px; font-weight: 700; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${enquiry.id}</td>
                </tr>
                
                <!-- Full Name -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">👤</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Full Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 500; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${enquiry.fullName}</td>
                </tr>
                
                <!-- Phone -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">📞</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Phone Number</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><a href="tel:${enquiry.phone}" style="color: #0F4C81; text-decoration: none;">${enquiry.phone}</a></td>
                </tr>
                
                <!-- Email -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">📧</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Email Address</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><a href="mailto:${enquiry.email}" style="color: #0F4C81; text-decoration: none;">${enquiry.email}</a></td>
                </tr>
                
                <!-- Enquiry Type -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">📋</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Enquiry Type</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-block;">
                      ${enquiry.enquiryType}
                    </span>
                  </td>
                </tr>
                
                <!-- Submitted Date -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">🕒</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Submitted Date</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${submittedAt} (IST)</td>
                </tr>

                <!-- Website -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">🌐</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Website</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><a href="${emailConfig.website}" target="_blank" style="color: #0F4C81; text-decoration: none; font-weight: 500;">${emailConfig.website}</a></td>
                </tr>
                
                <!-- IP Address -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 30px; vertical-align: top;">📍</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">IP Address</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${enquiry.ipAddress || 'Not recorded'}</td>
                </tr>
                
                <!-- Browser -->
                <tr>
                  <td style="padding: 10px 0; width: 30px; vertical-align: top;">🖥</td>
                  <td style="padding: 10px 0; width: 140px; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Browser</td>
                  <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${enquiry.browser || 'Not recorded'}</td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Message Header -->
        <p style="font-size: 14px; font-weight: 700; color: #0F4C81; margin: 24px 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          💬 Customer Message:
        </p>
        
        <!-- Quotation Box -->
        <div style="background-color: #f8fafc; border-left: 4px solid #0F4C81; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-top-left-radius: 0; border-bottom-left-radius: 0; margin-bottom: 24px;">
          <span style="font-size: 36px; color: #cbd5e1; line-height: 1; font-family: Georgia, serif; display: block; height: 10px; margin-top: -12px;">“</span>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${enquiry.message}
          </p>
        </div>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-top: 16px;">
              <a href="mailto:${enquiry.email}" style="background: linear-gradient(135deg, #0F4C81 0%, #1F6FEB 100%); color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px rgba(15, 76, 129, 0.2); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Reply to Customer Email
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    ${generateWhyKonfylSection()}
    ${generateFooter()}
  </body>
</html>`;
};

/**
 * 2. Complete Customer HTML email template
 */
export const generateCustomerEmail = (enquiry) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thank you for contacting KONFYL</title>
    <style type="text/css">
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; }
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: none !important;
        font-size: inherit !important;
        font-family: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
      }
      @media screen and (max-width: 600px) {
        .why-konfyl-card {
          display: block !important;
          width: 100% !important;
          padding-right: 0 !important;
          padding-left: 0 !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc;">
    ${generateHeader('Thank You for Contacting Us', 'We have successfully received your enquiry.')}
    
    <!-- Main Content Body -->
    <tr>
      <td style="padding: 32px 24px; background-color: #ffffff;">
        <p style="font-size: 16px; font-weight: 700; color: #0F4C81; margin-top: 0; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Dear ${enquiry.fullName},
        </p>
        <p style="font-size: 15px; color: #334155; margin-top: 0; margin-bottom: 24px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Thank you for reaching out to <strong>KONFYL Pharmaceutical Pvt Ltd</strong>. We appreciate you taking the time to write to us regarding your enquiry about <strong>"${enquiry.enquiryType}"</strong>.
        </p>
        <p style="font-size: 15px; color: #334155; margin-top: 0; margin-bottom: 24px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Our dedicated healthcare support and medical relations team is currently reviewing your query. A representative will get back to you shortly.
        </p>
        
        <!-- Reference ID Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px dashed #22c55e; border-radius: 12px; margin-bottom: 28px; border-collapse: separate;">
          <tr>
            <td align="center" style="padding: 20px;">
              <span style="font-size: 12px; color: #15803d; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Your Reference Enquiry ID
              </span>
              <strong style="font-size: 24px; color: #16a34a; letter-spacing: 0.05em; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800;">
                ${enquiry.id}
              </strong>
              <span style="font-size: 11px; color: #166534; display: block; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Please reference this ID for any future communications regarding this request.
              </span>
            </td>
          </tr>
        </table>

        <!-- Enquiry Details Summary -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px; border-collapse: separate;">
          <tr>
            <td style="padding: 16px;">
              <strong style="font-size: 13px; color: #0F4C81; display: block; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Summary of your request
              </strong>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600; width: 100px; padding-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Type:</td>
                  <td style="font-size: 13px; color: #334155; padding-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500;">${enquiry.enquiryType}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Message:</td>
                  <td style="font-size: 13px; color: #334155; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-style: italic;">"${enquiry.message.length > 150 ? enquiry.message.substring(0, 150) + '...' : enquiry.message}"</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 0; margin-bottom: 24px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          If you have any urgent updates or questions, please reply directly to this email or write to us at <a href="mailto:${emailConfig.email}" style="color: #0F4C81; text-decoration: underline; font-weight: 600;">${emailConfig.email}</a>.
        </p>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p style="margin: 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Warm regards,</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0F4C81; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Customer Relations & Medical Affairs</p>
          <p style="margin: 2px 0 0 0; font-size: 13px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">KONFYL Pharmaceutical Pvt Ltd</p>
        </div>
      </td>
    </tr>
    
    ${generateWhyKonfylSection()}
    ${generateFooter()}
  </body>
</html>`;
};

/**
 * Sends a notification email to info@konfyl.com with details of the new enquiry
 */
export const sendEnquiryNotification = async (enquiry) => {
  const html = generateAdminEmail(enquiry);

  return sendEmailWithRetry({
    from: fromEmail,
    to: infoEmail,
    subject: `New Enquiry ${enquiry.id} | KONFYL Website`,
    html
  }, `Enquiry Notification (${enquiry.id})`);
};

/**
 * Sends a confirmation/thank you email to the customer
 */
export const sendCustomerConfirmation = async (enquiry) => {
  const html = generateCustomerEmail(enquiry);

  return sendEmailWithRetry({
    from: fromEmail,
    to: enquiry.email,
    subject: `Thank you for contacting KONFYL Pharmaceutical Pvt Ltd [Ref: ${enquiry.id}]`,
    html
  }, `Customer Auto-Reply (${enquiry.id})`);
};
