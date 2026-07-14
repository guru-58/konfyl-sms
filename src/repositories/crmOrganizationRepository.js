import { db } from '../config/firebaseAdmin.js';

const COLLECTION_NAME = 'organizationUnits';

export const crmOrganizationRepository = {
  /**
   * Fetch all units with optional type/active/parentId filter
   */
  async getAll(filters = {}) {
    // Fetch all — in-memory filter avoids composite index issues
    const snapshot = await db.collection(COLLECTION_NAME).get();
    let units = [];
    snapshot.forEach(doc => units.push({ id: doc.id, ...doc.data() }));

    // Filter by type
    if (filters.type) {
      units = units.filter(u => u.type === filters.type);
    }
    // Filter by active status — supports both boolean `active` flag and string `activeStatus`
    if (filters.active !== undefined) {
      const wantActive = filters.active === true || filters.active === 'true';
      units = units.filter(u => {
        const status = (u.activeStatus || (u.active === false ? 'INACTIVE' : 'ACTIVE')).toUpperCase();
        return wantActive ? status === 'ACTIVE' : status === 'INACTIVE';
      });
    }
    if (filters.activeStatus) {
      units = units.filter(u => {
        const status = (u.activeStatus || (u.active === false ? 'INACTIVE' : 'ACTIVE')).toUpperCase();
        return status === filters.activeStatus.toUpperCase();
      });
    }
    // Filter by parentId
    if (filters.parentId !== undefined) {
      units = units.filter(u => u.parentId === filters.parentId);
    }

    // Sort by type hierarchy then name
    const typeOrder = { ZONE: 1, REGION: 2, HEADQUARTERS: 3, TERRITORY: 4 };
    units.sort((a, b) => {
      const ta = typeOrder[a.type] || 99;
      const tb = typeOrder[b.type] || 99;
      if (ta !== tb) return ta - tb;
      return (a.name || '').localeCompare(b.name || '');
    });

    return units;
  },

  /**
   * Get single unit by ID
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
   * Find unit by unique code and type
   */
  async getByCode(code, type) {
    const query = db.collection(COLLECTION_NAME)
      .where('code', '==', code.toUpperCase().trim())
      .where('type', '==', type);
    const snapshot = await query.get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Create new organization unit
   */
  async create(data) {
    const docRef = db.collection(COLLECTION_NAME).doc();
    const payload = {
      ...data,
      code: data.code.toUpperCase().trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await docRef.set(payload);
    return { id: docRef.id, ...payload };
  },

  /**
   * Update organization unit
   */
  async update(id, data) {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    if (payload.code) {
      payload.code = payload.code.toUpperCase().trim();
    }
    await docRef.update(payload);
    return { id, ...payload };
  },

  /**
   * Update active status
   */
  async updateStatus(id, active, updatedBy) {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const activeBool = active === true || active === 'true' || active === 'ACTIVE';
    const activeStatus = activeBool ? 'ACTIVE' : 'INACTIVE';
    await docRef.update({
      active: activeBool,
      activeStatus,          // 'ACTIVE' | 'INACTIVE'
      updatedAt: new Date().toISOString(),
      updatedBy
    });
  },

  /**
   * Check if there are active child units
   */
  async hasActiveChildUnits(parentId) {
    // In-memory check — consistent with getAll approach
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('parentId', '==', parentId)
      .get();
    let hasActive = false;
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = (data.activeStatus || (data.active === false ? 'INACTIVE' : 'ACTIVE')).toUpperCase();
      if (status === 'ACTIVE') hasActive = true;
    });
    return hasActive;
  }
};
