const mapCategory = category => category
  ? {
      id: category.id,
      name: category.name,
      description: category.description
    }
  : null;

const mapTherapeuticArea = therapeuticArea => therapeuticArea
  ? {
      id: therapeuticArea.id,
      name: therapeuticArea.name,
      description: therapeuticArea.description
    }
  : null;

const parseJsonArray = value => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mapDetailedInfo = detailedInfo => detailedInfo
  ? {
      mechanism: detailedInfo.mechanism,
      indications: detailedInfo.indications,
      contraindications: detailedInfo.contraindications,
      dosage: detailedInfo.dosage,
      sideEffects: detailedInfo.sideEffects,
      storage: detailedInfo.storage,
      sellingPoints: detailedInfo.sellingPoints,
      faqs: parseJsonArray(detailedInfo.faqs),
      doctorFaqs: parseJsonArray(detailedInfo.doctorFaqs),
      visualAids: detailedInfo.visualAids || [],
      clinicalReferences: detailedInfo.clinicalReferences
    }
  : null;

const mapCompetitor = competitor => ({
  id: competitor.id,
  name: competitor.name,
  manufacturer: competitor.manufacturer,
  composition: competitor.composition,
  strength: competitor.strength,
  price: competitor.price,
  comparisonNotes: competitor.comparisonNotes
});

export const mapProductListItem = product => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  brand: product.brand,
  composition: product.composition,
  keywords: product.keywords || [],
  seoTitle: product.seoTitle,
  seoDescription: product.seoDescription,
  seoKeywords: product.seoKeywords || [],
  category: mapCategory(product.category),
  therapeuticArea: mapTherapeuticArea(product.therapeuticArea),
  updatedAt: product.updatedAt
});

export const mapProductDetail = product => ({
  ...mapProductListItem(product),
  viewCount: product.viewCount,
  detailedInfo: mapDetailedInfo(product.detailedInfo),
  competitors: Array.isArray(product.competitors) ? product.competitors.map(mapCompetitor) : [],
  createdAt: product.createdAt
});

export const mapProductListResponse = ({ items, total, page, pageSize }) => ({
  items: items.map(mapProductListItem),
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize)
});
