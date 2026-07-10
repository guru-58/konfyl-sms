import express from 'express';
import { getStockists } from '../controllers/stockistController.js';

const router = express.Router();

// GET /api/stockists?city=Mumbai
router.get('/', getStockists);

export default router;
