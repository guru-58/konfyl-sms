import express from 'express';
import { 
  getReportingAssignments, 
  createReportingAssignment, 
  getTerritoryAssignments, 
  createTerritoryAssignment, 
  getAssignmentHistory,
  closeReporting,
  closeTerritory
} from '../controllers/crmAssignmentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';

const router = express.Router();

router.get('/reporting-assignments', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getReportingAssignments);
router.post('/reporting-assignments', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, createReportingAssignment);
router.put('/reporting-assignments/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, closeReporting);

router.get('/territory-assignments', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getTerritoryAssignments);
router.post('/territory-assignments', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, createTerritoryAssignment);
router.put('/territory-assignments/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, closeTerritory);

router.get('/assignment-history', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getAssignmentHistory);

export default router;
