export const mapEnquiryRequest = (body) => ({
  fullName: body.fullName,
  phone: body.phone,
  email: body.email,
  enquiryType: body.enquiryType,
  message: body.message,
  captchaToken: body.captchaToken || ''
});
