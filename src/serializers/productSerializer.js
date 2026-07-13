/**
 * Serializes a full product document for public endpoints.
 * Never exposes audit or backend-only fields.
 * @param {Object} product 
 * @returns {Object}
 */
export const serializePublicProduct = (product) => {
  if (!product) return null;

  return {
    slug: product.slug,
    name: product.name,
    composition: product.composition,
    strength: product.strength || null,
    dosageForm: product.dosageForm || null,
    primaryCategory: product.primaryCategory || null,
    categoryCodes: product.categoryCodes || [],
    packSize: product.packSize || null,
    shortDescription: product.shortDescription || null,
    indications: product.indications || null,
    medicalInfo: {
      overview: product.medicalInfo?.overview || null,
      mechanismOfAction: product.medicalInfo?.mechanismOfAction || null,
      dosageAdministration: product.medicalInfo?.dosageAdministration || null,
      clinicalEfficacy: product.medicalInfo?.clinicalEfficacy || null,
      precautionsContraindications: product.medicalInfo?.precautionsContraindications || null,
      adverseEffects: product.medicalInfo?.adverseEffects || null,
      interactions: product.medicalInfo?.interactions || null,
      storage: product.medicalInfo?.storage || null
    },
    faqs: (product.faqs || []).map(faq => ({
      question: faq.question,
      answer: faq.answer
    })),
    image: product.image ? {
      src: product.image.src,
      alt: product.image.alt,
      width: product.image.width || null,
      height: product.image.height || null
    } : null,
    brandOwner: product.brandOwner || null,
    marketer: product.marketer || null,
    manufacturer: product.manufacturer || null,
    medicalDisclaimer: product.medicalDisclaimer || null,
    isFeatured: !!product.isFeatured,
    featuredRank: product.featuredRank !== undefined ? product.featuredRank : null,
    marketingHighlights: product.marketingHighlights || [],
    status: product.status,
    contentReviewStatus: product.contentReviewStatus || 'LEGACY_NEEDS_REVIEW',
    contentVersion: product.contentVersion || 1,
    sourceReferences: (product.sourceReferences || []).map(ref => ({
      title: ref.title,
      documentType: ref.documentType || null,
      identifier: ref.identifier || null,
      version: ref.version || null,
      url: ref.url || null,
      reviewedAt: ref.reviewedAt || null
    })),
    publishedAt: product.publishedAt || null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
};

/**
 * Serializes light catalog information for product listings.
 * @param {Object} product 
 * @returns {Object}
 */
export const serializePublicCatalog = (product) => {
  if (!product) return null;

  return {
    slug: product.slug,
    name: product.name,
    composition: product.composition,
    primaryCategory: product.primaryCategory || null,
    categoryCodes: product.categoryCodes || [],
    packSize: product.packSize || null,
    shortDescription: product.shortDescription || null,
    image: product.image ? {
      src: product.image.src,
      alt: product.image.alt
    } : null,
    isFeatured: !!product.isFeatured,
    featuredRank: product.featuredRank !== undefined ? product.featuredRank : null,
    marketingHighlights: product.marketingHighlights || [],
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
};

/**
 * Serializes product with full audit details for admins.
 * @param {Object} product 
 * @returns {Object}
 */
export const serializeAdminProduct = (product) => {
  if (!product) return null;

  return {
    ...serializePublicProduct(product),
    createdBy: product.createdBy || null,
    updatedBy: product.updatedBy || null
  };
};
