import express from 'express';
import { createVisit, getVisits } from '../controllers/visitController.js';
import { verifyFirebaseToken } from '../middleware/auth.js';

const router = express.Router();

// MR: log a visit (auth required)
router.post('/', verifyFirebaseToken, createVisit);

// MR: get visit history (auth required)
router.get('/', verifyFirebaseToken, getVisits);

export default router;
