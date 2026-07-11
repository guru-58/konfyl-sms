import express from 'express';
import { signup, login, getMe, changePassword, deleteUser, updateUser, resetUserPassword } from '../controllers/authController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', authenticateToken, requireRole('admin'), signup);
router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.delete('/users/:id', authenticateToken, requireRole('admin'), deleteUser);
router.put('/users/:id', authenticateToken, requireRole('admin'), updateUser);
router.post('/users/:id/reset-password', authenticateToken, requireRole('admin'), resetUserPassword);
router.get('/me', authenticateToken, getMe);

export default router;
