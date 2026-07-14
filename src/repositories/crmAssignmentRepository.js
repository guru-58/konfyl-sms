import { db } from '../config/firebaseAdmin.js';

const REPORTING_COLL = 'reportingAssignments';
const TERRITORY_COLL = 'territoryAssignments';

export const crmAssignmentRepository = {
  /**
   * Get reporting assignments with optional filters
   */
  async getReportingAssignments(filters = {}) {
    let query = db.collection(REPORTING_COLL);
    if (filters.employeeId) {
      query = query.where('employeeId', '==', filters.employeeId);
    }
    if (filters.managerId) {
      query = query.where('managerId', '==', filters.managerId);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    const snapshot = await query.get();
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  /**
   * Get territory assignments with optional filters
   */
  async getTerritoryAssignments(filters = {}) {
    let query = db.collection(TERRITORY_COLL);
    if (filters.employeeId) {
      query = query.where('employeeId', '==', filters.employeeId);
    }
    if (filters.territoryId) {
      query = query.where('territoryId', '==', filters.territoryId);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    const snapshot = await query.get();
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  /**
   * Get assignment history across both reporting and unit assignments for a user
   */
  async getAssignmentHistory(employeeId) {
    const reportingSnap = await db.collection(REPORTING_COLL)
      .where('employeeId', '==', employeeId)
      .get();
    const territorySnap = await db.collection(TERRITORY_COLL)
      .where('employeeId', '==', employeeId)
      .get();
      
    const reporting = [];
    reportingSnap.forEach(doc => {
      reporting.push({ id: doc.id, type: 'REPORTING', ...doc.data() });
    });
    
    const territory = [];
    territorySnap.forEach(doc => {
      territory.push({ id: doc.id, type: 'TERRITORY', ...doc.data() });
    });
    
    // Combine and sort by createdAt descending
    const combined = [...reporting, ...territory];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return combined;
  },

  /**
   * Close any existing active reporting assignment and create a new one in a transaction
   */
  async saveReportingAssignment(newAssignment, updater) {
    return await db.runTransaction(async (transaction) => {
      const now = new Date().toISOString();
      
      // If it is primary, close previous primary active assignments for this employee
      if (newAssignment.isPrimary) {
        const queryRef = db.collection(REPORTING_COLL)
          .where('employeeId', '==', newAssignment.employeeId)
          .where('isPrimary', '==', true)
          .where('status', '==', 'ACTIVE');
        
        const existingDocs = await transaction.get(queryRef);
        existingDocs.forEach(doc => {
          const data = doc.data();
          // Set effectiveTo to the day before new effectiveFrom, or now
          const prevEffectiveTo = newAssignment.effectiveFrom || now.split('T')[0];
          transaction.update(doc.ref, {
            status: 'INACTIVE',
            effectiveTo: prevEffectiveTo,
            updatedAt: now,
            updatedBy: updater
          });
        });
      }

      // Save new assignment
      const newDocRef = db.collection(REPORTING_COLL).doc();
      const payload = {
        ...newAssignment,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        createdBy: updater,
        updatedBy: updater
      };
      transaction.set(newDocRef, payload);
      return { id: newDocRef.id, ...payload };
    });
  },

  /**
   * Close existing active assignments for a territory/unit and create a new one in a transaction
   */
  async saveTerritoryAssignment(newAssignment, updater) {
    return await db.runTransaction(async (transaction) => {
      const now = new Date().toISOString();
      
      // For PRIMARY assignmentType, ensure we close the previous active primary assignment for this territory
      if (newAssignment.assignmentType === 'PRIMARY') {
        const queryRef = db.collection(TERRITORY_COLL)
          .where('territoryId', '==', newAssignment.territoryId)
          .where('assignmentType', '==', 'PRIMARY')
          .where('status', '==', 'ACTIVE');
          
        const existingDocs = await transaction.get(queryRef);
        existingDocs.forEach(doc => {
          const data = doc.data();
          const prevEffectiveTo = newAssignment.effectiveFrom || now.split('T')[0];
          transaction.update(doc.ref, {
            status: 'INACTIVE',
            effectiveTo: prevEffectiveTo,
            updatedAt: now,
            updatedBy: updater
          });
        });
      }

      // Save new assignment
      const newDocRef = db.collection(TERRITORY_COLL).doc();
      const payload = {
        ...newAssignment,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        createdBy: updater,
        updatedBy: updater
      };
      transaction.set(newDocRef, payload);
      return { id: newDocRef.id, ...payload };
    });
  },

  /**
   * Close reporting assignment manually
   */
  async closeReportingAssignment(id, effectiveTo, updater) {
    const docRef = db.collection(REPORTING_COLL).doc(id);
    const now = new Date().toISOString();
    await docRef.update({
      status: 'INACTIVE',
      effectiveTo: effectiveTo || now.split('T')[0],
      updatedAt: now,
      updatedBy: updater
    });
  },

  /**
   * Close territory assignment manually
   */
  async closeTerritoryAssignment(id, effectiveTo, updater) {
    const docRef = db.collection(TERRITORY_COLL).doc(id);
    const now = new Date().toISOString();
    await docRef.update({
      status: 'INACTIVE',
      effectiveTo: effectiveTo || now.split('T')[0],
      updatedAt: now,
      updatedBy: updater
    });
  }
};
