import express from 'express';
import { getPublicProducts, getPublicProductBySlug } from '../controllers/productController.js';
import { nosqlInjectionPrevention } from '../middleware/security.js';

const router = express.Router();

router.get('/products', nosqlInjectionPrevention, getPublicProducts);
router.get('/products/:slug', nosqlInjectionPrevention, getPublicProductBySlug);

export default router;
