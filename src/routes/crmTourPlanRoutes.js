import express from 'express';
import multer from 'multer';
import { 
  createPlan, 
  saveDayPlan, 
  getPlan, 
  getPlans, 
  submitPlan, 
  requestChanges, 
  approvePlan, 
  reassignApprover,
  getComments,
  getRevisions,
  getJointWorkUsers,
  generatePreview,
  applyGeneratedPreview,
  saveBulkDays,
  distributeActivities,
  regenerateUnplanned,
  downloadTemplate,
  importPreview,
  importConfirm,
  importErrors
} from '../controllers/crmTourPlanController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { nosqlInjectionPrevention, xssSanitization } from '../middleware/security.js';
import { calculateCrmScope } from '../middleware/crmScopeMiddleware.js';

const router = express.Router();

const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only standard .xlsx spreadsheets are allowed.'), false);
    }
  }
});

// General authentication & scope calculation middleware for all CRM tour plans
router.use(authenticateToken);
router.use(calculateCrmScope);

// Scoped representative and manager routes
router.get('/tour-plans', nosqlInjectionPrevention, getPlans);
router.post('/tour-plans', nosqlInjectionPrevention, xssSanitization, createPlan);

// Quick Builder & Excel Template Creation Endpoints
router.post('/tour-plans/generate-preview', nosqlInjectionPrevention, xssSanitization, generatePreview);
router.post('/tour-plans/:planId/apply-generated-preview', nosqlInjectionPrevention, xssSanitization, applyGeneratedPreview);
router.post('/tour-plans/:planId/bulk-days', nosqlInjectionPrevention, xssSanitization, saveBulkDays);
router.post('/tour-plans/:planId/distribute-activities', nosqlInjectionPrevention, xssSanitization, distributeActivities);
router.post('/tour-plans/:planId/regenerate-unplanned', nosqlInjectionPrevention, xssSanitization, regenerateUnplanned);

router.get('/tour-plans/template', nosqlInjectionPrevention, downloadTemplate);
router.post('/tour-plans/import-preview', upload.single('file'), importPreview);
router.post('/tour-plans/:planId/import-confirm', nosqlInjectionPrevention, xssSanitization, importConfirm);
router.get('/tour-plans/import-errors/:previewToken', nosqlInjectionPrevention, importErrors);

router.get('/tour-plans/:planId', nosqlInjectionPrevention, getPlan);
router.put('/tour-plans/:planId/days/:planDate', nosqlInjectionPrevention, xssSanitization, saveDayPlan);
router.post('/tour-plans/:planId/submit', nosqlInjectionPrevention, submitPlan);
router.get('/tour-plan-options/joint-work-users', nosqlInjectionPrevention, getJointWorkUsers);

router.post('/tour-plans/:planId/request-changes', nosqlInjectionPrevention, xssSanitization, requestChanges);
router.post('/tour-plans/:planId/approve', nosqlInjectionPrevention, xssSanitization, approvePlan);

router.get('/tour-plans/:planId/comments', nosqlInjectionPrevention, getComments);
router.get('/tour-plans/:planId/revisions', nosqlInjectionPrevention, getRevisions);

// Admin-only override routes
router.post('/admin/tour-plans/:planId/request-changes', requireRole('admin'), nosqlInjectionPrevention, xssSanitization, requestChanges);
router.post('/admin/tour-plans/:planId/approve', requireRole('admin'), nosqlInjectionPrevention, xssSanitization, approvePlan);
router.post('/admin/tour-plans/:planId/reassign', requireRole('admin'), nosqlInjectionPrevention, xssSanitization, reassignApprover);

export default router;
