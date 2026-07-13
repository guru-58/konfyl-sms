import { productRepository } from '../repositories/productRepository.js';
import { validateProductInput } from '../validators/productValidator.js';

export class ProductServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const productService = {
  /**
   * Get all products with filters
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getAll(options = {}) {
    let products = await productRepository.getAll();

    // 1. Filter by status if requested
    if (options.publicOnly) {
      products = products.filter(p => p.status === 'PUBLISHED');
    }

    // 2. Filter by category code
    if (options.category) {
      const categoryLower = options.category.toLowerCase().trim();
      products = products.filter(p => {
        const primaryMatch = p.primaryCategory?.code?.toLowerCase() === categoryLower;
        const codesMatch = Array.isArray(p.categoryCodes) && p.categoryCodes.some(c => c.toLowerCase() === categoryLower);
        return primaryMatch || codesMatch;
      });
    }

    // 3. Filter by search query (name or composition)
    if (options.search) {
      const searchLower = options.search.toLowerCase().trim();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.composition.toLowerCase().includes(searchLower)
      );
    }

    // 4. Deterministic sorting
    // Featured products first (by featuredRank asc, nulls last), then name alphabetically
    products.sort((a, b) => {
      const aFeat = !!a.isFeatured;
      const bFeat = !!b.isFeatured;

      if (aFeat && !bFeat) return -1;
      if (!aFeat && bFeat) return 1;

      if (aFeat && bFeat) {
        const aRank = a.featuredRank !== null && a.featuredRank !== undefined ? a.featuredRank : Infinity;
        const bRank = b.featuredRank !== null && b.featuredRank !== undefined ? b.featuredRank : Infinity;
        if (aRank !== bRank) {
          return aRank - bRank;
        }
      }

      return a.name.localeCompare(b.name);
    });

    // 5. Apply safe limits
    if (options.limit) {
      const limitVal = parseInt(options.limit, 10);
      if (!isNaN(limitVal) && limitVal > 0) {
        products = products.slice(0, limitVal);
      }
    }

    return products;
  },

  /**
   * Get single product by slug
   * @param {string} slug 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async getBySlug(slug, options = {}) {
    if (!slug) {
      throw new ProductServiceError('Product slug is required.', 400);
    }

    const product = await productRepository.getBySlug(slug);

    if (!product) {
      throw new ProductServiceError('Product not found.', 404);
    }

    if (options.publicOnly && product.status !== 'PUBLISHED') {
      throw new ProductServiceError('Product not found.', 404);
    }

    return product;
  },

  /**
   * Create new product
   * @param {Object} inputData 
   * @param {string} creator 
   * @returns {Promise<Object>}
   */
  async create(inputData, creator) {
    const { isValid, errors } = validateProductInput(inputData);
    if (!isValid) {
      throw new ProductServiceError(JSON.stringify(errors), 400);
    }

    const slug = inputData.slug.toLowerCase().trim();

    // Check slug uniqueness
    const existing = await productRepository.getBySlug(slug);
    if (existing) {
      throw new ProductServiceError('A product with this slug already exists.', 409);
    }

    const now = new Date().toISOString();
    const newProduct = {
      ...inputData,
      slug,
      status: inputData.status || 'DRAFT',
      contentVersion: 1,
      contentReviewStatus: inputData.contentReviewStatus || 'LEGACY_NEEDS_REVIEW',
      publishedAt: inputData.status === 'PUBLISHED' ? now : null,
      createdAt: now,
      updatedAt: now,
      createdBy: creator || 'system',
      updatedBy: creator || 'system'
    };

    return await productRepository.create(slug, newProduct);
  },

  /**
   * Update existing product
   * @param {string} slug 
   * @param {Object} inputData 
   * @param {string} updater 
   * @returns {Promise<Object>}
   */
  async update(slug, inputData, updater) {
    const existing = await productRepository.getBySlug(slug);
    if (!existing) {
      throw new ProductServiceError('Product not found.', 404);
    }

    // Slug is immutable in Phase 1
    if (inputData.slug && inputData.slug.toLowerCase().trim() !== slug) {
      throw new ProductServiceError('Product slug is immutable and cannot be changed.', 400);
    }

    // Validate using inputData
    const mergedForValidation = {
      ...existing,
      ...inputData,
      slug // enforce existing slug
    };

    const { isValid, errors } = validateProductInput(mergedForValidation);
    if (!isValid) {
      throw new ProductServiceError(JSON.stringify(errors), 400);
    }

    // Detect if content changed to increment contentVersion
    const contentChanged = checkContentDifferences(existing, inputData);
    const now = new Date().toISOString();

    const updatedProduct = {
      ...existing,
      ...inputData,
      slug, // Enforce
      contentVersion: contentChanged ? (existing.contentVersion || 1) + 1 : (existing.contentVersion || 1),
      updatedAt: now,
      updatedBy: updater || 'system'
    };

    // Keep track of publishedAt if status changed
    if (inputData.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      updatedProduct.publishedAt = now;
    } else if (inputData.status && inputData.status !== 'PUBLISHED') {
      updatedProduct.publishedAt = null;
    }

    return await productRepository.update(slug, updatedProduct);
  },

  /**
   * Update status of product
   * @param {string} slug 
   * @param {string} newStatus 
   * @param {string} updater 
   * @returns {Promise<void>}
   */
  async updateStatus(slug, newStatus, updater) {
    const validStatuses = ['DRAFT', 'PUBLISHED'];
    if (!validStatuses.includes(newStatus)) {
      throw new ProductServiceError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const existing = await productRepository.getBySlug(slug);
    if (!existing) {
      throw new ProductServiceError('Product not found.', 404);
    }

    if (existing.status === newStatus) {
      return; // No change
    }

    const now = new Date().toISOString();
    let publishedAt = undefined;
    if (newStatus === 'PUBLISHED') {
      publishedAt = now;
    } else if (existing.status === 'PUBLISHED') {
      publishedAt = null; // Unpublish
    }

    await productRepository.updateStatus(slug, newStatus, publishedAt, now);
  },

  /**
   * Delete product by slug
   * @param {string} slug
   * @returns {Promise<void>}
   */
  async delete(slug) {
    const existing = await productRepository.getBySlug(slug);
    if (!existing) {
      throw new ProductServiceError('Product not found.', 404);
    }
    await productRepository.delete(slug);
  }
};

function checkContentDifferences(oldData, newData) {
  const contentKeys = [
    'name', 'composition', 'strength', 'dosageForm', 'packSize',
    'shortDescription', 'indications', 'brandOwner', 'marketer',
    'manufacturer', 'medicalDisclaimer', 'isFeatured', 'featuredRank',
    'marketingHighlights', 'medicalInfo', 'faqs', 'image'
  ];

  for (const key of contentKeys) {
    if (newData[key] !== undefined && JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
      return true;
    }
  }
  return false;
}
