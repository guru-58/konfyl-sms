import express from 'express';
import { signup, login, getMe } from '../controllers/authController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', authenticateToken, requireRole('admin'), signup);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);

export default router;
