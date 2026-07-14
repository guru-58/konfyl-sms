import { db } from '../config/firebaseAdmin.js';

const COLLECTION_NAME = 'specialties';

export const crmSpecialtyRepository = {
  /**
   * Fetch all specialties sorted by sortOrder or name
   */
  async getAll() {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    list.sort((a, b) => {
      const aSort = a.sortOrder !== undefined ? a.sortOrder : 999;
      const bSort = b.sortOrder !== undefined ? b.sortOrder : 999;
      if (aSort !== bSort) return aSort - bSort;
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  },

  /**
   * Get specialty by ID
   */
  async getById(id) {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() };
  },

  /**
   * Get specialty by code (e.g., gynecology)
   */
  async getByCode(code) {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('code', '==', code.toLowerCase().trim())
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Create specialty
   */
  async create(data) {
    const docRef = db.collection(COLLECTION_NAME).doc();
    const payload = {
      ...data,
      code: data.code.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await docRef.set(payload);
    return { id: docRef.id, ...payload };
  },

  /**
   * Update specialty
   */
  async update(id, data) {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    if (payload.code) {
      payload.code = payload.code.toLowerCase().trim();
    }
    await docRef.update(payload);
    return { id, ...payload };
  },

  /**
   * Update active status of specialty
   */
  async updateStatus(id, activeStatus, updatedBy) {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    await docRef.update({
      activeStatus,
      updatedAt: new Date().toISOString(),
      updatedBy
    });
  }
};
