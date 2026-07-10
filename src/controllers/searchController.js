import { searchKnowledge, autocompleteTerms } from '../services/searchService.js';
import logger from '../utils/logger.js';

export const searchProducts = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }
    const results = await searchKnowledge(query);
    return res.status(200).json({ results });
  } catch (error) {
    logger.error('Search API error', error);
    next(error);
  }
};

export const getAutocomplete = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }
    const suggestions = await autocompleteTerms(query);
    return res.status(200).json({ suggestions });
  } catch (error) {
    logger.error('Autocomplete API error', error);
    next(error);
  }
};
