import { getDashboardAnalytics } from '../services/analyticsService.js';
import logger from '../utils/logger.js';

export const getDashboard = async (req, res, next) => {
  try {
    const analytics = await getDashboardAnalytics();
    res.status(200).json(analytics);
  } catch (error) {
    logger.error('Analytics fetch failed', error);
    next(error);
  }
};
