import { db } from '../config/firebaseAdmin.js';
import { crmTourPlanRepository } from '../repositories/crmTourPlanRepository.js';
import { crmAuditRepository } from '../repositories/crmAuditRepository.js';
import { crmOrganizationRepository } from '../repositories/crmOrganizationRepository.js';
import { crmDoctorRepository } from '../repositories/crmDoctorRepository.js';
import { crmInstitutionRepository } from '../repositories/crmInstitutionRepository.js';
import { validateTourPlanCreateInput, validateTourPlanDaySaveInput } from '../validators/crmTourPlanValidator.js';
import { CrmServiceError } from './crmOrganizationService.js';
import { FieldValue } from 'firebase-admin/firestore';

export const crmTourPlanService = {
  /**
   * Create new Monthly Tour Plan in DRAFT mode
   */
  async createPlan(monthKey, actor) {
    // derive MR identity from authenticated user
    const mrId = actor.id;

    // Validate Month limits
    const { isValid, errors } = validateTourPlanCreateInput({ monthKey });
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    // 1. Fetch MR user details from db to derive name/email
    const userDoc = await db.collection('users').doc(mrId).get();
    if (!userDoc.exists) {
      throw new CrmServiceError('MR User not found.', 404);
    }
    const user = userDoc.data();

    // 2. Validate active territory assignments exist for this MR
    const todayStr = new Date().toISOString().split('T')[0];
    const terrAssignmentsSnap = await db.collection('territoryAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();
    
    let hasActiveTerritory = false;
    terrAssignmentsSnap.forEach(doc => {
      const data = doc.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        hasActiveTerritory = true;
      }
    });

    if (!hasActiveTerritory) {
      throw new CrmServiceError('At least one active territory assignment is required to create a Tour Plan.', 400);
    }

    // 3. Validate active reporting assignment (manager) exists for this MR
    const reportAssignmentsSnap = await db.collection('reportingAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();

    let hasActiveManager = false;
    reportAssignmentsSnap.forEach(doc => {
      const data = doc.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        hasActiveManager = true;
      }
    });

    if (!hasActiveManager) {
      throw new CrmServiceError('An active reporting assignment is required to create a Tour Plan.', 400);
    }

    // Deterministic Plan ID
    const planId = `${mrId}_${monthKey}`;

    const planData = {
      mrId,
      mrName: user.name || mrId,
      mrEmail: user.email,
      monthKey,
      status: 'DRAFT',
      revisionNumber: 1,
      version: 1,
      createdBy: actor.id,
      updatedBy: actor.id
    };

    const newPlan = await crmTourPlanRepository.createPlan(planId, planData);

    // Audit Logging
    await crmAuditRepository.log({
      entityType: 'TOUR_PLAN',
      entityId: planId,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Created Monthly Tour Plan for ${monthKey} in DRAFT status.`
    });

    return newPlan;
  },

  /**
   * Save a single day draft and recalculate the plan summary
   */
  async saveDayPlan(planId, planDate, dayData, actor) {
    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) {
      throw new CrmServiceError('Tour plan not found.', 404);
    }

    // Validate inputs
    const { isValid, errors } = validateTourPlanDaySaveInput(dayData, planDate, plan.monthKey);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    // Initialize backend-derived snapshots
    let territoryName = null;
    let headquartersId = null;
    let jointWorkUserName = null;

    // Backend Resolution of Territory
    if (dayData.territoryId) {
      const territory = await crmOrganizationRepository.getById(dayData.territoryId);
      if (!territory || !territory.active || territory.type !== 'TERRITORY') {
        throw new CrmServiceError(`Territory unit "${dayData.territoryId}" does not exist or is inactive.`, 400);
      }
      territoryName = territory.name;
      headquartersId = territory.parentId;

      // Validate MR is assigned to this territory (or its parent headquarters) on this date
      const terrAssignments = await db.collection('territoryAssignments')
        .where('employeeId', '==', plan.mrId)
        .where('status', '==', 'ACTIVE')
        .get();

      let isAssigned = false;
      terrAssignments.forEach(doc => {
        const data = doc.data();
        const matchesUnit = data.territoryId === dayData.territoryId || (territory.parentId && data.territoryId === territory.parentId);
        if (matchesUnit && data.effectiveFrom <= planDate && (!data.effectiveTo || data.effectiveTo >= planDate)) {
          isAssigned = true;
        }
      });

      if (!isAssigned && actor.role !== 'admin') {
        throw new CrmServiceError(`Representative is not assigned to territory "${territoryName}" on date "${planDate}".`, 400);
      }
    }

    // Backend Resolution of Joint Work Manager
    if (dayData.jointWorkUserId) {
      const jUserDoc = await db.collection('users').doc(dayData.jointWorkUserId).get();
      if (!jUserDoc.exists) {
        throw new CrmServiceError('Joint work user not found.', 400);
      }
      const jUser = jUserDoc.data();
      if (jUser.employmentStatus === 'INACTIVE') {
        throw new CrmServiceError('Joint work manager is currently inactive.', 400);
      }
      jointWorkUserName = jUser.name || dayData.jointWorkUserId;

      // Verify that this joint work user is in the reporting hierarchy (is an active manager of the MR)
      const reportAssignments = await db.collection('reportingAssignments')
        .where('employeeId', '==', plan.mrId)
        .where('managerId', '==', dayData.jointWorkUserId)
        .where('status', '==', 'ACTIVE')
        .get();

      let isManager = false;
      reportAssignments.forEach(doc => {
        const data = doc.data();
        if (data.effectiveFrom <= planDate && (!data.effectiveTo || data.effectiveTo >= planDate)) {
          isManager = true;
        }
      });

      if (!isManager && actor.role !== 'admin') {
        // Also check if they report to a ZSM directly or if manager role matches ZSM
        throw new CrmServiceError('Joint work manager must be a direct active reporting manager in hierarchy.', 400);
      }
    }

    // Backend Activity Derivation & Verification
    const resolvedActivities = [];
    if (dayData.activities) {
      for (const act of dayData.activities) {
        const resolvedAct = {
          activityType: act.activityType,
          objective: act.objective || null,
          plannedTime: act.plannedTime || null,
          remarks: act.remarks || null
        };

        if (act.activityType === 'DOCTOR_VISIT') {
          const doctor = await crmDoctorRepository.getById(act.doctorId);
          if (!doctor || doctor.activeStatus !== 'ACTIVE') {
            throw new CrmServiceError(`Doctor ID "${act.doctorId}" does not exist or is inactive.`, 400);
          }
          resolvedAct.doctorId = act.doctorId;
          resolvedAct.doctorName = doctor.displayName;

          // Check if practice location is valid and matches territory
          if (act.practiceLocationId) {
            const ploc = await db.collection('doctorPracticeLocations').doc(act.practiceLocationId).get();
            if (!ploc.exists || ploc.data().activeStatus !== 'ACTIVE') {
              throw new CrmServiceError(`Practice location ID "${act.practiceLocationId}" is invalid or inactive.`, 400);
            }
            const plocData = ploc.data();
            if (plocData.doctorId !== act.doctorId) {
              throw new CrmServiceError('Practice location does not match the selected doctor.', 400);
            }
            if (plocData.territoryId !== dayData.territoryId) {
              throw new CrmServiceError('Doctor practice location territory must match the planned day territory.', 400);
            }
            resolvedAct.practiceLocationId = act.practiceLocationId;
          }
        } else if (act.activityType === 'INSTITUTION_VISIT') {
          const institution = await crmInstitutionRepository.getById(act.institutionId);
          if (!institution || institution.activeStatus !== 'ACTIVE') {
            throw new CrmServiceError(`Institution ID "${act.institutionId}" does not exist or is inactive.`, 400);
          }
          resolvedAct.institutionId = act.institutionId;
          resolvedAct.institutionName = institution.name;

          if (institution.territoryId !== dayData.territoryId) {
            throw new CrmServiceError('Institution territory must match the planned day territory.', 400);
          }
        }

        resolvedActivities.push(resolvedAct);
      }
    }

    const dayPayload = {
      dayType: dayData.dayType,
      territoryId: dayData.territoryId || null,
      territoryName,
      headquartersId,
      jointWorkUserId: dayData.jointWorkUserId || null,
      jointWorkUserName,
      workLocationText: dayData.workLocationText || null,
      remarks: dayData.remarks || null,
      sequence: dayData.sequence || 1,
      version: dayData.version
    };

    // Save Day & Activities in transaction
    const { version: nextVersion } = await crmTourPlanRepository.saveDayPlan(
      planId, planDate, dayPayload, resolvedActivities, actor
    );

    // Recalculate summary and save in-place
    await this.recalculateSummary(planId);

    // Audit Log
    await crmAuditRepository.log({
      entityType: 'TOUR_PLAN',
      entityId: planId,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Updated plan for date ${planDate} (${dayData.dayType}) in plan ${planId}.`
    });

    return { success: true, version: nextVersion };
  },

  /**
   * Recalculate and update the tour plan summary based on day records and activities
   */
  async recalculateSummary(planId) {
    const days = await crmTourPlanRepository.getPlanDays(planId);
    const activities = await crmTourPlanRepository.getPlanActivities(planId);

    let plannedFieldDays = 0;
    let plannedJointWorkDays = 0;
    let plannedNonFieldDays = 0;

    days.forEach(day => {
      if (day.dayType === 'FIELD_WORK') {
        plannedFieldDays += 1;
      } else if (day.dayType === 'JOINT_FIELD_WORK') {
        plannedJointWorkDays += 1;
      } else {
        plannedNonFieldDays += 1;
      }
    });

    let plannedDoctorVisits = 0;
    let plannedInstitutionVisits = 0;

    activities.forEach(act => {
      if (act.activityType === 'DOCTOR_VISIT') {
        plannedDoctorVisits += 1;
      } else if (act.activityType === 'INSTITUTION_VISIT') {
        plannedInstitutionVisits += 1;
      }
    });

    const summary = {
      plannedFieldDays,
      plannedDoctorVisits,
      plannedInstitutionVisits,
      plannedJointWorkDays,
      plannedNonFieldDays
    };

    await crmTourPlanRepository.updatePlanFields(planId, { summary });
  },

  /**
   * Scoped Fetch: Retrieve single plan with detailed days and activities
   */
  async getPlan(planId, crmScope, actor) {
    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) return null;

    // Check visibility scope
    if (!crmScope.all && !crmScope.teamUserIds.includes(plan.mrId)) {
      throw new CrmServiceError('Access denied: Scoped plan visibility restriction.', 403);
    }

    const days = await crmTourPlanRepository.getPlanDays(planId);
    const activities = await crmTourPlanRepository.getPlanActivities(planId);

    // Group activities by day ID for easier client usage
    const daysWithActivities = days.map(day => {
      const dayActs = activities
        .filter(act => act.tourPlanDayId === day.id)
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      return {
        ...day,
        activities: dayActs
      };
    });

    return {
      ...plan,
      days: daysWithActivities
    };
  },

  /**
   * Retrieve list of tour plans matching filters
   */
  async getPlans(filters, crmScope, actor) {
    // Restrict filter queries based on role scope
    if (!crmScope.all) {
      if (filters.mrId) {
        if (!crmScope.teamUserIds.includes(filters.mrId)) {
          throw new CrmServiceError('Access denied to specified representative plans.', 403);
        }
      } else {
        // Force query within scoped team
        // Firestore 'in' limit of 30
        const chunk = crmScope.teamUserIds.slice(0, 30);
        // We will fetch plans but since firestore in-queries are limited, we'll return list filtered by scopes
        const allPlans = await crmTourPlanRepository.getPlans(filters);
        return allPlans.filter(p => chunk.includes(p.mrId));
      }
    }

    return await crmTourPlanRepository.getPlans(filters);
  }
};
