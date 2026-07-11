import express from 'express';
import { getExams, createExam, updateExam, deleteExam } from '../controllers/examController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getExams);
router.post('/', authenticateToken, requireRole('admin'), createExam);
router.put('/:id', authenticateToken, requireRole('admin'), updateExam);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteExam);

export default router;
