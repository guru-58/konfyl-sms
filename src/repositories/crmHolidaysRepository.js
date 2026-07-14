import { db } from '../config/firebaseAdmin.js';

export const crmHolidaysRepository = {
  /**
   * Fetch all active holidays within a specific month (YYYY-MM)
   */
  async getHolidaysForMonth(monthKey) {
    try {
      const snapshot = await db.collection('holidays')
        .where('date', '>=', `${monthKey}-01`)
        .where('date', '<=', `${monthKey}-31`)
        .get();
      
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.activeStatus !== 'INACTIVE' && data.status !== 'INACTIVE') {
          list.push({ id: doc.id, ...data });
        }
      });
      return list;
    } catch (err) {
      // Return empty array if collection doesn't exist or fails
      return [];
    }
  }
};
