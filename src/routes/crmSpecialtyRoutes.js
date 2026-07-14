import express from 'express';
import { getSpecialties, createSpecialty, updateSpecialty, updateSpecialtyStatus } from '../controllers/crmSpecialtyController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';

const router = express.Router();

const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Access denied for this user role.' });
    }
    next();
  };
};

router.use(authenticateToken);

router.get('/specialties', requireAnyRole(['admin', 'mr', 'rsm', 'zsm']), nosqlInjectionPrevention, getSpecialties);
router.post('/specialties', requireRole('admin'), nosqlInjectionPrevention, xssSanitization, createSpecialty);
router.put('/specialties/:id', requireRole('admin'), nosqlInjectionPrevention, xssSanitization, updateSpecialty);
router.patch('/specialties/:id/status', requireRole('admin'), nosqlInjectionPrevention, updateSpecialtyStatus);

export default router;
