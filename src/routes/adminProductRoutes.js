import express from 'express';
import { 
  getAdminProducts, 
  getAdminProductBySlug, 
  createProduct, 
  updateProduct, 
  updateProductStatus,
  deleteProduct
} from '../controllers/productController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';

const router = express.Router();

// Apply auth and role protection to all admin routes
router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/products', nosqlInjectionPrevention, getAdminProducts);
router.get('/products/:slug', nosqlInjectionPrevention, getAdminProductBySlug);
router.post('/products', nosqlInjectionPrevention, xssSanitization, createProduct);
router.put('/products/:slug', nosqlInjectionPrevention, xssSanitization, updateProduct);
router.patch('/products/:slug/status', nosqlInjectionPrevention, updateProductStatus);
router.delete('/products/:slug', nosqlInjectionPrevention, deleteProduct);

export default router;
