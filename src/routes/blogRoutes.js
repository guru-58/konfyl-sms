import express from 'express';
import { listBlogs, getBlogBySlug } from '../controllers/blogController.js';

const router = express.Router();

router.get('/', listBlogs);
router.get('/:slug', getBlogBySlug);

export default router;
