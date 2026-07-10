import express from 'express';
import { listEnquiries, getEnquiry, updateEnquiryStatus } from '../controllers/adminEnquiryController.js';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Admin: list all enquiries
router.get('/', verifyFirebaseToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), listEnquiries);

// Admin: get single enquiry
router.get('/:id', verifyFirebaseToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), getEnquiry);

// Admin: update enquiry status
router.patch('/:id/status', verifyFirebaseToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), updateEnquiryStatus);

export default router;
