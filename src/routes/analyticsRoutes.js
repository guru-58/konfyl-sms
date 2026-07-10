import express from 'express';
import { getDashboard } from '../controllers/analyticsController.js';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyFirebaseToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), getDashboard);

export default router;
