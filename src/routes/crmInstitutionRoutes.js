import express from 'express';
import { 
  getInstitutions, getInstitutionById, createInstitution, updateInstitution, updateInstitutionStatus
} from '../controllers/crmInstitutionController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';

const router = express.Router();

router.get('/institutions', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getInstitutions);
router.get('/institutions/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getInstitutionById);
router.post('/institutions', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, createInstitution);
router.put('/institutions/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, updateInstitution);
router.patch('/institutions/:id/status', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, updateInstitutionStatus);

export default router;
