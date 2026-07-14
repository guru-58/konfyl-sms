import express from 'express';
import { 
  getDoctors, getDoctorById, createDoctor, updateDoctor, updateDoctorStatus,
  getPracticeLocations, createPracticeLocation, updatePracticeLocation, updatePracticeLocationStatus
} from '../controllers/crmDoctorController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';

const router = express.Router();

router.get('/doctors', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getDoctors);
router.get('/doctors/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getDoctorById);
router.post('/doctors', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, createDoctor);
router.put('/doctors/:id', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, updateDoctor);
router.patch('/doctors/:id/status', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, updateDoctorStatus);

// Practice Locations
router.get('/doctors/:id/practice-locations', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, getPracticeLocations);
router.post('/doctors/:id/practice-locations', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, createPracticeLocation);
router.put('/doctors/:id/practice-locations/:locationId', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, xssSanitization, updatePracticeLocation);
router.patch('/doctors/:id/practice-locations/:locationId/status', authenticateToken, requireRole('admin'), nosqlInjectionPrevention, updatePracticeLocationStatus);

export default router;
