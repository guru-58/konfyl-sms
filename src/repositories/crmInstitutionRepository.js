import { db } from '../config/firebaseAdmin.js';

const COLLECTION_NAME = 'institutions';

export const crmInstitutionRepository = {
  /**
   * Fetch all institutions with search, filters, pagination and sorting
   */
  async getAll(options = {}) {
    // Fetch entire collection — in-memory filter/sort avoids composite index requirements.
    // Institution counts in a field-force CRM are in the hundreds, so this is safe.
    const snapshot = await db.collection(COLLECTION_NAME).get();
    let results = [];
    snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

    // Filter
    if (options.territoryId) {
      results = results.filter(r => r.territoryId === options.territoryId);
    }
    if (options.activeStatus) {
      results = results.filter(r => r.activeStatus === options.activeStatus);
    }
    if (options.type) {
      results = results.filter(r => r.type === options.type);
    }
    if (options.search) {
      const q = options.search.toLowerCase().trim();
      results = results.filter(r => (r.normalizedName || r.name || '').toLowerCase().includes(q));
    }

    // Sort
    const sortBy = options.sortBy || 'name';
    const sortDir = options.sortOrder === 'desc' ? -1 : 1;
    results.sort((a, b) => {
      const av = (a[sortBy] || '').toString().toLowerCase();
      const bv = (b[sortBy] || '').toString().toLowerCase();
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });

    const totalCount = results.length;

    // Paginate
    if (options.page || options.limit) {
      const pageVal = parseInt(options.page, 10) || 1;
      const limitVal = parseInt(options.limit, 10) || 10;
      const start = (pageVal - 1) * limitVal;
      return { data: results.slice(start, start + limitVal), totalCount };
    }

    return { data: results, totalCount };
  },

  /**
   * Get institution by ID
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
   * Get institution by unique code
   */
  async getByCode(institutionCode) {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('institutionCode', '==', institutionCode.toUpperCase().trim())
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Find potential duplicates
   */
  async findPotentialDuplicates(criteria) {
    const duplicates = [];
    const queryName = criteria.normalizedName;
    const queryPincode = criteria.pincode;

    if (queryName && queryPincode) {
      const snapshot = await db.collection(COLLECTION_NAME)
        .where('normalizedName', '==', queryName)
        .where('address.pincode', '==', queryPincode.trim())
        .get();
      snapshot.forEach(doc => duplicates.push({ id: doc.id, ...doc.data() }));
    }

    return duplicates;
  },

  /**
   * Create institution
   */
  async create(data) {
    const docRef = db.collection(COLLECTION_NAME).doc();
    const payload = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await docRef.set(payload);
    return { id: docRef.id, ...payload };
  },

  /**
   * Update institution
   */
  async update(id, data) {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    await docRef.update(payload);
    return { id, ...payload };
  },

  /**
   * Update activeStatus
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
