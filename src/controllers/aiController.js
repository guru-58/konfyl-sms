import { answerWithRAG } from '../services/aiService.js';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

export const askAI = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    // Resolve relational database user ID by searching for matching firebaseUid or email
    let dbUserId = null;
    if (req.user) {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { firebaseUid: req.user.uid },
            { email: req.user.email }
          ]
        }
      });
      dbUserId = dbUser?.id || null;
    }

    const response = await answerWithRAG(question.trim(), dbUserId);
    return res.status(200).json(response);
  } catch (error) {
    logger.error('AI question API error', error);
    next(error);
  }
};
