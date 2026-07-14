import { db } from '../config/firebaseAdmin.js';

const DOCTORS_COLL = 'doctors';
const LOCATIONS_COLL = 'doctorPracticeLocations';

export const crmDoctorRepository = {
  /**
   * Fetch all doctors with pagination, search, sorting and filters
   */
  async getAll(options = {}) {
    // Fetch entire collection — in-memory filter/sort avoids composite index requirements.
    const snapshot = await db.collection(DOCTORS_COLL).get();
    let results = [];
    snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

    // Filter
    if (options.territoryId) {
      results = results.filter(r => r.primaryTerritoryId === options.territoryId);
    }
    if (options.activeStatus) {
      results = results.filter(r => r.activeStatus === options.activeStatus);
    }
    if (options.specialtyCode) {
      results = results.filter(r => r.specialtyCode === options.specialtyCode);
    }
    if (options.search) {
      const q = options.search.toLowerCase().trim();
      results = results.filter(r =>
        (r.normalizedName || r.displayName || '').toLowerCase().includes(q)
      );
    }

    // Cross-collection filter: doctors linked to a specific institution
    if (options.institutionId) {
      const locSnapshot = await db.collection(LOCATIONS_COLL)
        .where('institutionId', '==', options.institutionId)
        .where('activeStatus', '==', 'ACTIVE')
        .get();
      const doctorIds = [];
      locSnapshot.forEach(doc => doctorIds.push(doc.data().doctorId));
      results = results.filter(doc => doctorIds.includes(doc.id));
    }

    // Sort
    const sortBy = options.sortBy || 'displayName';
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
      results = results.slice(start, start + limitVal);
    }

    return { data: results, totalCount };
  },

  /**
   * Get doctor by ID
   */
  async getById(id) {
    const docRef = db.collection(DOCTORS_COLL).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() };
  },

  /**
   * Get doctor by unique doctor code
   */
  async getByCode(doctorCode) {
    const snapshot = await db.collection(DOCTORS_COLL)
      .where('doctorCode', '==', doctorCode.toUpperCase().trim())
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Find doctor by registration number
   */
  async getByRegistration(registrationNumber) {
    const snapshot = await db.collection(DOCTORS_COLL)
      .where('registrationNumber', '==', registrationNumber.trim())
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Perform duplicate check scan in backend service layer
   */
  async findPotentialDuplicates(criteria) {
    const duplicates = [];
    const queryName = criteria.normalizedName;
    const queryReg = criteria.registrationNumber;
    const queryMobile = criteria.mobile;

    // 1. Check normalizedName
    if (queryName) {
      const nameSnap = await db.collection(DOCTORS_COLL)
        .where('normalizedName', '==', queryName)
        .get();
      nameSnap.forEach(doc => duplicates.push({ id: doc.id, ...doc.data() }));
    }

    // 2. Check registration number
    if (queryReg) {
      const regSnap = await db.collection(DOCTORS_COLL)
        .where('registrationNumber', '==', queryReg.trim())
        .get();
      regSnap.forEach(doc => {
        if (!duplicates.some(d => d.id === doc.id)) {
          duplicates.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    // 3. Check mobile
    if (queryMobile) {
      const mobSnap = await db.collection(DOCTORS_COLL)
        .where('contact.mobile', '==', queryMobile.trim())
        .get();
      mobSnap.forEach(doc => {
        if (!duplicates.some(d => d.id === doc.id)) {
          duplicates.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    return duplicates;
  },

  /**
   * Create doctor
   */
  async create(doctorData) {
    const docRef = db.collection(DOCTORS_COLL).doc();
    const payload = {
      ...doctorData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await docRef.set(payload);
    return { id: docRef.id, ...payload };
  },

  /**
   * Update doctor
   */
  async update(id, doctorData) {
    const docRef = db.collection(DOCTORS_COLL).doc(id);
    const payload = {
      ...doctorData,
      updatedAt: new Date().toISOString()
    };
    await docRef.update(payload);
    return { id, ...payload };
  },

  /**
   * Update activeStatus
   */
  async updateStatus(id, activeStatus, updatedBy) {
    const docRef = db.collection(DOCTORS_COLL).doc(id);
    await docRef.update({
      activeStatus,
      updatedAt: new Date().toISOString(),
      updatedBy
    });
  },

  // ----------------------------------------------------
  // Practice Locations
  // ----------------------------------------------------

  async getPracticeLocations(doctorId) {
    const snapshot = await db.collection(LOCATIONS_COLL)
      .where('doctorId', '==', doctorId)
      .get();
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  async createPracticeLocation(locationData) {
    const docRef = db.collection(LOCATIONS_COLL).doc();
    const payload = {
      ...locationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await docRef.set(payload);
    return { id: docRef.id, ...payload };
  },

  async updatePracticeLocation(id, locationData) {
    const docRef = db.collection(LOCATIONS_COLL).doc(id);
    const payload = {
      ...locationData,
      updatedAt: new Date().toISOString()
    };
    await docRef.update(payload);
    return { id, ...payload };
  },

  async updatePracticeLocationStatus(id, activeStatus, updatedBy) {
    const docRef = db.collection(LOCATIONS_COLL).doc(id);
    await docRef.update({
      activeStatus,
      updatedAt: new Date().toISOString(),
      updatedBy
    });
  },

  /**
   * Checks if doctor is linked to any active practice locations
   */
  async getActiveLocationsForDoctor(doctorId) {
    const snapshot = await db.collection(LOCATIONS_COLL)
      .where('doctorId', '==', doctorId)
      .where('activeStatus', '==', 'ACTIVE')
      .get();
    return snapshot.size;
  },

  /**
   * Checks if doctor is linked to a specific institution
   */
  async getDoctorInstitutionLink(doctorId, institutionId) {
    const snapshot = await db.collection(LOCATIONS_COLL)
      .where('doctorId', '==', doctorId)
      .where('institutionId', '==', institutionId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
};
