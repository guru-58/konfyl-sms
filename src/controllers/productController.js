import { productService, ProductServiceError } from '../services/productService.js';
import { serializePublicProduct, serializePublicCatalog, serializeAdminProduct } from '../serializers/productSerializer.js';
import logger from '../utils/logger.js';

// Helper to handle service errors
const handleControllerError = (res, err, defaultMsg) => {
  if (err instanceof ProductServiceError) {
    if (err.statusCode === 400) {
      try {
        const parsedErrors = JSON.parse(err.message);
        return res.status(400).json({ errors: parsedErrors });
      } catch {
        return res.status(400).json({ error: err.message });
      }
    }
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(`${defaultMsg}:`, err);
  return res.status(500).json({ error: 'An unexpected database or application error occurred.' });
};

// ----------------------------------------------------
// Public Controllers
// ----------------------------------------------------

export const getPublicProducts = async (req, res) => {
  try {
    const { category, search, limit } = req.query;
    
    const products = await productService.getAll({
      publicOnly: true,
      category,
      search,
      limit
    });

    const serialized = products.map(p => serializePublicCatalog(p));

    // Cache header for public data
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    return res.status(200).json({
      data: serialized,
      meta: {
        count: serialized.length
      }
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getPublicProducts');
  }
};

export const getPublicProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = await productService.getBySlug(slug, {
      publicOnly: true
    });

    const serialized = serializePublicProduct(product);

    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    return res.status(200).json({
      data: serialized
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in getPublicProductBySlug (slug: ${req.params.slug})`);
  }
};

// ----------------------------------------------------
// Admin Controllers
// ----------------------------------------------------

export const getAdminProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const products = await productService.getAll({
      publicOnly: false,
      category,
      search
    });

    const serialized = products.map(p => serializeAdminProduct(p));

    return res.status(200).json({
      data: serialized,
      meta: {
        count: serialized.length
      }
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getAdminProducts');
  }
};

export const getAdminProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = await productService.getBySlug(slug, {
      publicOnly: false
    });

    const serialized = serializeAdminProduct(product);

    return res.status(200).json({
      data: serialized
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in getAdminProductBySlug (slug: ${req.params.slug})`);
  }
};

export const createProduct = async (req, res) => {
  try {
    const userEmail = req.user?.email || 'admin';
    const product = await productService.create(req.body, userEmail);
    const serialized = serializeAdminProduct(product);

    return res.status(201).json({
      message: 'Product created successfully.',
      data: serialized
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createProduct');
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    const userEmail = req.user?.email || 'admin';
    
    const product = await productService.update(slug, req.body, userEmail);
    const serialized = serializeAdminProduct(product);

    return res.status(200).json({
      message: 'Product updated successfully.',
      data: serialized
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateProduct (slug: ${req.params.slug})`);
  }
};

export const updateProductStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;
    const userEmail = req.user?.email || 'admin';

    if (!status) {
      return res.status(400).json({ error: 'Status field is required.' });
    }

    await productService.updateStatus(slug, status, userEmail);

    return res.status(200).json({
      message: `Product status updated to ${status} successfully.`
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateProductStatus (slug: ${req.params.slug})`);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    await productService.delete(slug);
    return res.status(200).json({
      message: 'Product deleted successfully.'
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in deleteProduct (slug: ${req.params.slug})`);
  }
};
