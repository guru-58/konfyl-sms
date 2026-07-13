const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_PATH_REGEX = /^\/[a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+$/; // matches local paths like /images/dydrofact-10.jpeg
const FULL_URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

export const validateProductInput = (data, isPublishing = false) => {
  const errors = {};

  // 1. Validate Slug
  if (!data.slug || typeof data.slug !== 'string') {
    errors.slug = 'Slug is required and must be a string.';
  } else {
    const slugVal = data.slug.trim();
    if (!SLUG_REGEX.test(slugVal)) {
      errors.slug = 'Slug must be lowercase, alphanumeric, and hyphen-separated (URL-safe).';
    }
  }

  // 2. Validate Name
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.name = 'Product name is required.';
  } else if (data.name.length > 100) {
    errors.name = 'Product name must not exceed 100 characters.';
  }

  // 3. Validate Composition
  if (!data.composition || typeof data.composition !== 'string' || data.composition.trim().length === 0) {
    errors.composition = 'Composition is required.';
  } else if (data.composition.length > 250) {
    errors.composition = 'Composition must not exceed 250 characters.';
  }

  // 4. Validate Status
  const validStatuses = ['DRAFT', 'PUBLISHED'];
  if (!data.status) {
    errors.status = 'Status is required.';
  } else if (!validStatuses.includes(data.status)) {
    errors.status = `Status must be one of: ${validStatuses.join(', ')}.`;
  }

  // 5. Validate Categories
  if (!data.primaryCategory || typeof data.primaryCategory !== 'object') {
    errors.primaryCategory = 'Primary category is required.';
  } else {
    const { code, name } = data.primaryCategory;
    const validCodes = ['women-wellness', 'orthopedics', 'general-medicine', 'nutraceuticals'];
    if (!code || !validCodes.includes(code)) {
      errors.primaryCategory = `Primary category code must be one of: ${validCodes.join(', ')}.`;
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.primaryCategoryName = 'Primary category name is required.';
    }
  }

  if (data.categoryCodes !== undefined) {
    if (!Array.isArray(data.categoryCodes)) {
      errors.categoryCodes = 'Category codes must be an array of strings.';
    } else {
      const invalidCodes = data.categoryCodes.filter(c => typeof c !== 'string');
      if (invalidCodes.length > 0) {
        errors.categoryCodes = 'All category codes must be strings.';
      }
    }
  }

  // 6. Validate Image Structure if provided
  if (data.image !== undefined && data.image !== null) {
    if (typeof data.image !== 'object') {
      errors.image = 'Image must be an object or null.';
    } else {
      const { src, alt, width, height } = data.image;
      if (!src || typeof src !== 'string' || src.trim().length === 0) {
        errors.imageSrc = 'Image source path is required.';
      } else {
        const isLocal = URL_PATH_REGEX.test(src);
        const isFull = FULL_URL_REGEX.test(src);
        if (!isLocal && !isFull) {
          errors.imageSrc = 'Image source must be a valid absolute URL or a safe local path (e.g. /images/product.jpg).';
        }
        if (src.includes('product-range.jpeg') || src.includes('catalog')) {
          errors.imageSrc = 'Generic catalog images must not be used as product package images in structured data.';
        }
      }
      if (!alt || typeof alt !== 'string' || alt.trim().length === 0) {
        errors.imageAlt = 'Image alt text is required.';
      }
    }
  }

  // 7. Validate FAQs
  if (data.faqs !== undefined && data.faqs !== null) {
    if (!Array.isArray(data.faqs)) {
      errors.faqs = 'FAQs must be an array.';
    } else {
      data.faqs.forEach((faq, idx) => {
        if (typeof faq !== 'object' || !faq.question || !faq.answer) {
          errors[`faq_${idx}`] = 'Each FAQ must be an object with question and answer.';
        } else {
          if (typeof faq.question !== 'string' || faq.question.trim().length === 0) {
            errors[`faq_q_${idx}`] = 'FAQ question must be a non-empty string.';
          }
          if (typeof faq.answer !== 'string' || faq.answer.trim().length === 0) {
            errors[`faq_a_${idx}`] = 'FAQ answer must be a non-empty string.';
          }
        }
      });
    }
  }

  // 8. Validate Medical Info Structure
  if (data.medicalInfo !== undefined && data.medicalInfo !== null) {
    if (typeof data.medicalInfo !== 'object') {
      errors.medicalInfo = 'medicalInfo must be an object.';
    } else {
      const allowedKeys = [
        'overview', 'mechanismOfAction', 'dosageAdministration', 
        'clinicalEfficacy', 'precautionsContraindications', 
        'adverseEffects', 'interactions', 'storage'
      ];
      
      for (const key in data.medicalInfo) {
        if (!allowedKeys.includes(key)) {
          errors.medicalInfoKeys = `Unknown key inside medicalInfo: ${key}`;
        } else if (data.medicalInfo[key] !== null && typeof data.medicalInfo[key] !== 'string') {
          errors[`medicalInfo_${key}`] = `${key} inside medicalInfo must be a string or null.`;
        }
      }
    }
  }

  // 9. Additional publishing validations
  if (isPublishing || data.status === 'PUBLISHED') {
    if (!data.shortDescription || typeof data.shortDescription !== 'string' || data.shortDescription.trim().length === 0) {
      errors.shortDescription = 'Short description is required for published products.';
    }
    if (data.packSize !== undefined && data.packSize !== null) {
      if (typeof data.packSize !== 'string' || data.packSize.trim().length === 0) {
        errors.packSize = 'Pack size must be a non-empty string.';
      }
    }
  }

  // 10. Check for HTML or script injection in plain text fields
  const plainTextFields = ['name', 'composition', 'shortDescription', 'indications', 'packSize', 'brandOwner', 'marketer', 'manufacturer', 'medicalDisclaimer'];
  plainTextFields.forEach(field => {
    const val = data[field];
    if (val && typeof val === 'string') {
      if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val) || /<[a-z][\s\S]*>/i.test(val)) {
        errors[field] = `HTML tags or scripts are not allowed in ${field}.`;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
