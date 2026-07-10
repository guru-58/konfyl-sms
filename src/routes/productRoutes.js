import express from 'express';
import { createProductRecord, getProductBySlugRecord, getProducts, getProduct } from '../controllers/productController.js';
import { getProductCourse } from '../controllers/courseController.js';
import { requireRole, verifyFirebaseToken } from '../middleware/auth.js';
import { validateQuerySchema, validateSchema, productCreateSchema, productListQuerySchema } from '../middleware/validator.js';

const router = express.Router();

router.get('/', validateQuerySchema(productListQuerySchema), getProducts);
router.post('/', verifyFirebaseToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), validateSchema(productCreateSchema), createProductRecord);
router.get('/slug/:slug', getProductBySlugRecord);
router.get('/:id', getProduct);
router.get('/:id/course', verifyFirebaseToken, getProductCourse);

export default router;
