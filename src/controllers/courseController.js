import { buildProductCourse } from '../services/courseService.js';
import logger from '../utils/logger.js';

export const getProductCourse = async (req, res, next) => {
  try {
    const productCourse = await buildProductCourse(req.params.id);

    if (!productCourse) {
      return res.status(404).json({ error: 'Product course not found.' });
    }

    return res.status(200).json(productCourse);
  } catch (error) {
    logger.error('Failed to compile product course layout', error);
    next(error);
  }
};
