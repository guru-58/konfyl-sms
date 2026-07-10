import { createProduct, listProducts, getProductById, getProductBySlug } from '../services/productService.js';
import { mapProductDetail, mapProductListResponse } from '../dtos/productDto.js';
import logger from '../utils/logger.js';

export const getProducts = async (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const data = await listProducts({ page, pageSize });
    res.status(200).json(mapProductListResponse(data));
  } catch (error) {
    logger.error('Failed to fetch products', error);
    next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(mapProductDetail(product));
  } catch (error) {
    logger.error('Failed to fetch product by ID', error);
    next(error);
  }
};

export const getProductBySlugRecord = async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(mapProductDetail(product));
  } catch (error) {
    logger.error('Failed to fetch product by slug', error);
    next(error);
  }
};

export const createProductRecord = async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(mapProductDetail(product));
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A product with this name or slug already exists.' });
    }
    logger.error('Failed to create product', error);
    next(error);
  }
};
