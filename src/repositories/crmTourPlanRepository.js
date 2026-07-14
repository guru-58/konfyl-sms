import { db } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { CrmServiceError } from '../services/crmOrganizationService.js';

const PLANS_COLL = 'tourPlans';
const DAYS_COLL = 'tourPlanDays';
const ACTIVITIES_COLL = 'tourPlanActivities';
const REVISIONS_COLL = 'tourPlanRevisions';
const COMMENTS_COLL = 'tourPlanComments';

export const crmTourPlanRepository = {
  /**
   * Get Tour Plan by deterministic document ID
   */
  async getPlanById(planId, transaction = null) {
    const docRef = db.collection(PLANS_COLL).doc(planId);
    const doc = transaction ? await transaction.get(docRef) : await docRef.get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Get Tour Plans using indexed filters and order
   */
  async getPlans(filters = {}) {
    let query = db.collection(PLANS_COLL);

    if (filters.mrId) {
      query = query.where('mrId', '==', filters.mrId);
    }
    if (filters.approverId) {
      query = query.where('approverId', '==', filters.approverId);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.monthKey) {
      query = query.where('monthKey', '==', filters.monthKey);
    }

    // Apply index-friendly sort
    if (filters.mrId) {
      query = query.orderBy('monthKey', 'desc');
    } else if (filters.approverId && filters.status) {
      query = query.orderBy('monthKey', 'desc');
    } else {
      query = query.orderBy('monthKey', 'desc');
    }

    // Pagination
    if (filters.limit) {
      const limitVal = parseInt(filters.limit, 10) || 10;
      query = query.limit(limitVal);
    }

    const snapshot = await query.get();
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  /**
   * Get all day plans for a Tour Plan
   */
  async getPlanDays(planId) {
    const snapshot = await db.collection(DAYS_COLL)
      .where('tourPlanId', '==', planId)
      .get();
    
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort days in-memory to avoid missing composite index errors on production/staging database
    list.sort((a, b) => a.planDate.localeCompare(b.planDate));
    return list;
  },

  /**
   * Get all activities for a Tour Plan
   */
  async getPlanActivities(planId) {
    const snapshot = await db.collection(ACTIVITIES_COLL)
      .where('tourPlanId', '==', planId)
      .get();
    
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  /**
   * Get day plan for a specific date
   */
  async getDayPlanByDate(planId, planDate, transaction = null) {
    const docId = `${planId}_${planDate}`;
    const docRef = db.collection(DAYS_COLL).doc(docId);
    const doc = transaction ? await transaction.get(docRef) : await docRef.get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Get activities for a specific day plan
   */
  async getDayActivities(dayId, transaction = null) {
    const query = db.collection(ACTIVITIES_COLL).where('tourPlanDayId', '==', dayId);
    const snapshot = transaction ? await transaction.get(query) : await query.get();
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  /**
   * Get comment history for a Tour Plan
   */
  async getComments(planId) {
    const snapshot = await db.collection(COMMENTS_COLL)
      .where('tourPlanId', '==', planId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  /**
   * Get revision history for a Tour Plan
   */
  async getRevisions(planId) {
    const snapshot = await db.collection(REVISIONS_COLL)
      .where('tourPlanId', '==', planId)
      .orderBy('revisionNumber', 'desc')
      .get();
    
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  },

  /**
   * Create Tour Plan document using deterministic ID in transaction for uniqueness lock
   */
  async createPlan(planId, planData) {
    return await db.runTransaction(async (transaction) => {
      const docRef = db.collection(PLANS_COLL).doc(planId);
      const doc = await transaction.get(docRef);
      if (doc.exists) {
        throw new CrmServiceError(`Tour plan for ${planData.monthKey} already exists.`, 409);
      }

      const payload = {
        ...planData,
        status: 'DRAFT',
        revisionNumber: 1,
        summary: {
          plannedFieldDays: 0,
          plannedDoctorVisits: 0,
          plannedInstitutionVisits: 0,
          plannedJointWorkDays: 0,
          plannedNonFieldDays: 0
        },
        version: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      transaction.set(docRef, payload);
      return { id: planId, ...payload };
    });
  },

  /**
   * Save a single day plan and its activities in a Firestore transaction
   */
  async saveDayPlan(planId, planDate, dayData, activities, actor) {
    return await db.runTransaction(async (transaction) => {
      const planRef = db.collection(PLANS_COLL).doc(planId);
      const dayId = `${planId}_${planDate}`;
      const dayRef = db.collection(DAYS_COLL).doc(dayId);
      const existingActsQuery = db.collection(ACTIVITIES_COLL).where('tourPlanDayId', '==', dayId);

      // Perform all reads first
      const planSnap = await transaction.get(planRef);
      const daySnap = await transaction.get(dayRef);
      const existingActsSnap = await transaction.get(existingActsQuery);

      if (!planSnap.exists) {
        throw new CrmServiceError('Tour plan not found.', 404);
      }
      
      const plan = planSnap.data();
      
      // Concurrency check
      if (plan.version !== dayData.version) {
        throw new CrmServiceError('Tour plan has been modified by another process. Please refresh.', 409);
      }

      // Check status allows editing
      if (!['DRAFT', 'CHANGES_REQUESTED'].includes(plan.status)) {
        throw new CrmServiceError(`Cannot edit a plan in ${plan.status} status.`, 400);
      }

      // Validate ownership
      if (plan.mrId !== actor.id && actor.role !== 'admin') {
        throw new CrmServiceError('Forbidden: You do not own this plan.', 403);
      }

      // Save/update day plan
      const dayPayload = {
        tourPlanId: planId,
        planDate,
        dayType: dayData.dayType,
        territoryId: dayData.territoryId || null,
        territoryName: dayData.territoryName || null,
        headquartersId: dayData.headquartersId || null,
        jointWorkUserId: dayData.jointWorkUserId || null,
        jointWorkUserName: dayData.jointWorkUserName || null,
        workLocationText: dayData.workLocationText || null,
        remarks: dayData.remarks || null,
        sequence: dayData.sequence || 1,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Determine if new or update for audit/createdAt
      if (!daySnap.exists) {
        dayPayload.createdAt = FieldValue.serverTimestamp();
      }

      // Perform all writes after reads
      transaction.set(dayRef, dayPayload, { merge: true });

      // Clean existing activities for this day
      existingActsSnap.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // Write new activities
      activities.forEach((act, idx) => {
        const actRef = db.collection(ACTIVITIES_COLL).doc();
        const actPayload = {
          tourPlanId: planId,
          tourPlanDayId: dayId,
          activityType: act.activityType,
          doctorId: act.doctorId || null,
          doctorName: act.doctorName || null,
          institutionId: act.institutionId || null,
          institutionName: act.institutionName || null,
          practiceLocationId: act.practiceLocationId || null,
          objective: act.objective || null,
          sequence: idx + 1,
          plannedTime: act.plannedTime || null,
          remarks: act.remarks || null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        transaction.set(actRef, actPayload);
      });

      // We defer recalculation of plan summary to the service layer 
      // but we increment version inside this transaction to prevent concurrent issues.
      const newVersion = plan.version + 1;
      transaction.update(planRef, {
        version: newVersion,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.id
      });

      return { version: newVersion };
    });
  },

  /**
   * Update plan general fields (e.g. status, summary, approver)
   */
  async updatePlanFields(planId, fields, expectedVersion = null) {
    const docRef = db.collection(PLANS_COLL).doc(planId);
    if (expectedVersion !== null) {
      return await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists) throw new CrmServiceError('Tour plan not found.', 404);
        const data = snap.data();
        if (data.version !== expectedVersion) {
          throw new CrmServiceError('Concurrency conflict: Plan has been modified.', 409);
        }
        const newVersion = data.version + 1;
        const payload = {
          ...fields,
          version: newVersion,
          updatedAt: FieldValue.serverTimestamp()
        };
        transaction.update(docRef, payload);
        return { version: newVersion };
      });
    } else {
      const payload = {
        ...fields,
        updatedAt: FieldValue.serverTimestamp()
      };
      await docRef.update(payload);
    }
  }
};
