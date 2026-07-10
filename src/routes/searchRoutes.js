import express from 'express';
import { searchProducts, getAutocomplete } from '../controllers/searchController.js';

const router = express.Router();

router.get('/', searchProducts);
router.get('/autocomplete', getAutocomplete);

export default router;
