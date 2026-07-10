import {
  countProducts,
  createProductWithDetails,
  findCategoryByName,
  findProductById,
  findProductBySlug,
  findProducts,
  findTherapeuticAreaByName
} from '../repositories/productRepository.js';

const categoryConfig = {
  'women-wellness': {
    categoryName: "Women's Wellness",
    therapeuticAreaName: 'Gynaecology & Reproductive Health'
  },
  nutra: {
    categoryName: 'Nutraceuticals',
    therapeuticAreaName: 'Antioxidants & Metabolic Wellness'
  },
  ortho: {
    categoryName: 'Orthopaedics',
    therapeuticAreaName: 'Bone & Vitamin Therapy'
  },
  general: {
    categoryName: 'General Physician',
    therapeuticAreaName: 'Anti-Infectives'
  }
};

const keywordList = value => String(value || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)
  .slice(0, 12);

const slugify = value => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const notFound = message => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

export const getProductById = async (productId) => {
  return findProductById(productId);
};

export const getProductBySlug = async slug => {
  return findProductBySlug(slug);
};

export const listProducts = async ({ page = 1, pageSize = 20 } = {}) => {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    findProducts({ skip, take: pageSize }),
    countProducts()
  ]);

  return { items, total, page, pageSize };
};

export const createProduct = async payload => {
  const config = categoryConfig[payload.category];
  if (!config) throw notFound('Unsupported product category.');

  const [category, therapeuticArea] = await Promise.all([
    findCategoryByName(config.categoryName),
    findTherapeuticAreaByName(config.therapeuticAreaName)
  ]);

  if (!category) throw notFound(`Product category not found: ${config.categoryName}`);
  if (!therapeuticArea) throw notFound(`Therapeutic area not found: ${config.therapeuticAreaName}`);

  return createProductWithDetails({
    productData: {
      name: payload.name,
      slug: slugify(payload.name),
      brand: 'KONFYL',
      composition: payload.composition,
      categoryId: category.id,
      therapeuticAreaId: therapeuticArea.id,
      keywords: keywordList(`${payload.name},${payload.composition},${payload.indications}`),
      seoTitle: `${payload.name} | ${payload.composition} | KONFYL Pharmaceutical`,
      seoDescription: payload.description,
      seoKeywords: keywordList(payload.indications)
    },
    detailData: {
      mechanism: payload.description,
      indications: payload.indications,
      contraindications: 'Use only under registered medical practitioner supervision. Contraindications to be updated by medical affairs.',
      dosage: `Pack: ${payload.pack}. Dosage to be followed strictly as prescribed by a physician.`,
      sideEffects: 'Safety profile to be updated by medical affairs.',
      storage: 'Store in a cool, dry place away from direct sunlight.',
      sellingPoints: payload.description,
      faqs: [],
      doctorFaqs: [],
      visualAids: [],
      clinicalReferences: 'Medical references pending internal review.'
    }
  });
};
