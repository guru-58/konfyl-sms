import express from 'express';
import { getOrgUnits, getOrgUnitById, createOrgUnit, updateOrgUnit, updateOrgUnitStatus } from '../controllers/crmOrganizationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';

const router = express.Router();

router.get('/organization-units', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getOrgUnits);
router.get('/organization-units/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getOrgUnitById);
router.post('/organization-units', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, createOrgUnit);
router.put('/organization-units/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, updateOrgUnit);
router.patch('/organization-units/:id/status', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, updateOrgUnitStatus);

export default router;
