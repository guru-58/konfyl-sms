import express from 'express';
import enquiryRoutes from './enquiryRoutes.js';
import adminEnquiryRoutes from './adminEnquiryRoutes.js';
import searchRoutes from './searchRoutes.js';
import aiRoutes from './aiRoutes.js';
import productRoutes from './productRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import blogRoutes from './blogRoutes.js';
import stockistRoutes from './stockistRoutes.js';
import visitRoutes from './visitRoutes.js';

const router = express.Router();

// Public
router.use('/enquiries', enquiryRoutes);           // POST /api/enquiries (public submission)
router.use('/search', searchRoutes);
router.use('/products', productRoutes);
router.use('/blogs', blogRoutes);
router.use('/stockists', stockistRoutes);

// Admin (auth-gated)
router.use('/admin/enquiries', adminEnquiryRoutes); // GET/PATCH /api/admin/enquiries
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/visits', visitRoutes);

export default router;
