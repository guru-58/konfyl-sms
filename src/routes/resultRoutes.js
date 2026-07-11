import express from 'express';
import { saveResult, getMRResults, getAllResults, getAllMRs } from '../controllers/resultController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, saveResult);
router.get('/mr', authenticateToken, getMRResults);
router.get('/all', authenticateToken, requireRole('admin'), getAllResults);
router.get('/mrs', authenticateToken, requireRole('admin'), getAllMRs);

export default router;
