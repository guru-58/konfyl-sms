import express from 'express';
import { askAI } from '../controllers/aiController.js';
import { verifyFirebaseToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyFirebaseToken, askAI);

export default router;
