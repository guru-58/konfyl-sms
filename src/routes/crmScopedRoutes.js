import express from 'express';
import { 
  getMyOrganization, 
  getMyTerritories, 
  getMyTeam, 
  getScopedDoctors, 
  getScopedDoctorById, 
  getScopedInstitutions, 
  getScopedInstitutionById 
} from '../controllers/crmScopedController.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateCrmScope } from '../middleware/crmScopeMiddleware.js';
import { nosqlInjectionPrevention } from '../middleware/security.js';

const router = express.Router();

router.use(authenticateToken);
router.use(calculateCrmScope);

router.get('/my-organization', nosqlInjectionPrevention, getMyOrganization);
router.get('/my-team', nosqlInjectionPrevention, getMyTeam);
router.get('/territories', nosqlInjectionPrevention, getMyTerritories);
router.get('/doctors', nosqlInjectionPrevention, getScopedDoctors);
router.get('/doctors/:id', nosqlInjectionPrevention, getScopedDoctorById);
router.get('/institutions', nosqlInjectionPrevention, getScopedInstitutions);
router.get('/institutions/:id', nosqlInjectionPrevention, getScopedInstitutionById);

export default router;
