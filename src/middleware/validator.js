import Joi from 'joi';

const enquirySchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().pattern(/^\+?[0-9\s\-()]{10,20}$/).required(),
  email: Joi.string().trim().email().required(),
  enquiryType: Joi.string().valid('Product Information', 'Distribution / Business', 'Healthcare Professional Query', 'General Enquiry').required(),
  message: Joi.string().trim().min(10).max(2000).required(),
  captchaToken: Joi.string().allow('', null)
});

const productListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20)
});

const productCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  composition: Joi.string().trim().min(5).max(500).required(),
  category: Joi.string().trim().valid('women-wellness', 'nutra', 'ortho', 'general').required(),
  pack: Joi.string().trim().min(2).max(160).required(),
  indications: Joi.string().trim().min(5).max(2000).required(),
  description: Joi.string().trim().min(10).max(3000).required()
});

export const validateSchema = schema => (req, res, next) => {
  const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.reduce((acc, item) => {
      acc[item.path.join('.')] = item.message.replace(/"/g, '');
      return acc;
    }, {});
    return res.status(400).json({ errors: details });
  }
  req.body = value;
  next();
};

export const validateQuerySchema = schema => (req, res, next) => {
  const { value, error } = schema.validate(req.query, { abortEarly: false, stripUnknown: true, convert: true });
  if (error) {
    const details = error.details.reduce((acc, item) => {
      acc[item.path.join('.')] = item.message.replace(/"/g, '');
      return acc;
    }, {});
    return res.status(400).json({ errors: details });
  }
  req.query = value;
  next();
};

export { enquirySchema, productListQuerySchema, productCreateSchema };
