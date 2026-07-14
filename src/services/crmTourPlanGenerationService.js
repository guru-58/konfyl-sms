import { db } from '../config/firebaseAdmin.js';
import { crmHolidaysRepository } from '../repositories/crmHolidaysRepository.js';
import { crmDoctorRepository } from '../repositories/crmDoctorRepository.js';
import { crmInstitutionRepository } from '../repositories/crmInstitutionRepository.js';
import { crmTourPlanRepository } from '../repositories/crmTourPlanRepository.js';
import { CrmServiceError } from './crmOrganizationService.js';

export const crmTourPlanGenerationService = {
  /**
   * Generate an in-memory preview of the monthly plan based on parameters
   */
  async generatePreview(actor, params) {
    const mrId = actor.id;
    const {
      monthKey,
      weekPattern = {},
      exceptions = {},
      selectedDoctors = [],
      selectedInstitutions = [],
      capacitySettings = {},
      preserveExisting = true
    } = params;

    if (!monthKey) {
      throw new CrmServiceError('Month key is required.', 400);
    }

    const [year, month] = monthKey.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();

    // 1. Fetch holidays
    const holidaysList = await crmHolidaysRepository.getHolidaysForMonth(monthKey);
    const holidayDates = new Set(holidaysList.map(h => h.date));

    // 2. Fetch existing plan activities if preserving
    let existingDays = [];
    let existingActs = [];
    if (preserveExisting) {
      const planId = `${mrId}_${monthKey}`;
      existingDays = await crmTourPlanRepository.getPlanDays(planId);
      existingActs = await crmTourPlanRepository.getPlanActivities(planId);
    }

    // 3. Load active assigned territories for verification
    const todayStr = new Date().toISOString().split('T')[0];
    const terrAssignmentsSnap = await db.collection('territoryAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();
    
    const assignedTerritoryIds = [];
    terrAssignmentsSnap.forEach(doc => {
      const data = doc.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        assignedTerritoryIds.push(data.territoryId);
      }
    });

    if (assignedTerritoryIds.length === 0) {
      throw new CrmServiceError('Representative has no active territory assignments.', 400);
    }

    // Load active organization units to map territory names
    const orgUnitsSnap = await db.collection('tourPlans').firestore.collection('organizationUnits').get();
    const orgUnitsMap = {};
    orgUnitsSnap.forEach(doc => {
      orgUnitsMap[doc.id] = doc.data();
    });

    // 4. Fetch details of selected doctors
    const doctorsList = [];
    if (selectedDoctors.length > 0) {
      for (const docId of selectedDoctors) {
        const docObj = await crmDoctorRepository.getById(docId);
        if (docObj && docObj.activeStatus === 'ACTIVE') {
          // Verify doctor territory is in MR assignments
          if (assignedTerritoryIds.includes(docObj.primaryTerritoryId)) {
            // Fetch practice locations
            const locations = await crmDoctorRepository.getPracticeLocations(docId);
            docObj.practiceLocations = locations.filter(l => l.activeStatus === 'ACTIVE');
            doctorsList.push(docObj);
          }
        }
      }
    }

    // 5. Fetch details of selected institutions
    const instList = [];
    if (selectedInstitutions.length > 0) {
      for (const instId of selectedInstitutions) {
        const instObj = await crmInstitutionRepository.getById(instId);
        if (instObj && instObj.activeStatus === 'ACTIVE') {
          if (assignedTerritoryIds.includes(instObj.territoryId)) {
            instList.push(instObj);
          }
        }
      }
    }

    const generatedDays = [];
    const generatedActivities = [];
    const warnings = [];
    const skipped = [];

    // Capacity parameters
    const maxDocPerDay = parseInt(capacitySettings.maxDoctorsPerDay, 10) || 5;
    const maxInstPerDay = parseInt(capacitySettings.maxInstitutionsPerDay, 10) || 2;
    const spacingMinutes = parseInt(capacitySettings.spacingMinutes, 10) || 30;
    const startTimeStr = capacitySettings.preferredStartTime || '09:00';
    const endTimeStr = capacitySettings.preferredEndTime || '17:00';

    // Space out visit slots helper
    const incrementTime = (timeStr, mins) => {
      const [h, m] = timeStr.split(':').map(Number);
      let totalMins = h * 60 + m + mins;
      const nextH = Math.floor(totalMins / 60) % 24;
      const nextM = totalMins % 60;
      return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
    };

    // Tracking planned frequencies for each doctor/institution
    const plannedDocFrequency = {};
    const plannedInstFrequency = {};

    // Seed frequencies with existing activities
    existingActs.forEach(act => {
      if (act.activityType === 'DOCTOR_VISIT' && act.doctorId) {
        plannedDocFrequency[act.doctorId] = (plannedDocFrequency[act.doctorId] || 0) + 1;
      } else if (act.activityType === 'INSTITUTION_VISIT' && act.institutionId) {
        plannedInstFrequency[act.institutionId] = (plannedInstFrequency[act.institutionId] || 0) + 1;
      }
    });

    // 6. Build the days calendar in memory
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dateStr = `${monthKey}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, dayNum);
      const weekdayIdx = dObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

      // Determine day settings
      let dayType = 'FIELD_WORK';
      let territoryId = assignedTerritoryIds[0] || null;
      let remarks = null;
      let jointWorkUserId = null;
      let jointWorkUserName = null;

      // check existing plan day if preserving
      const existingDay = existingDays.find(d => d.planDate === dateStr);

      if (existingDay) {
        dayType = existingDay.dayType;
        territoryId = existingDay.territoryId;
        remarks = existingDay.remarks;
        jointWorkUserId = existingDay.jointWorkUserId;
        jointWorkUserName = existingDay.jointWorkUserName;
      } else if (exceptions[dateStr]) {
        // Exception match
        dayType = exceptions[dateStr].dayType;
        territoryId = exceptions[dateStr].territoryId || territoryId;
        remarks = exceptions[dateStr].remarks || null;
        jointWorkUserId = exceptions[dateStr].jointWorkUserId || null;
      } else if (holidayDates.has(dateStr)) {
        // Holiday match
        dayType = 'HOLIDAY';
        territoryId = null;
        remarks = holidaysList.find(h => h.date === dateStr)?.name || 'Holiday';
      } else if (weekPattern[weekdayIdx]) {
        // Pattern match
        dayType = weekPattern[weekdayIdx].dayType;
        territoryId = weekPattern[weekdayIdx].territoryId || territoryId;
        jointWorkUserId = weekPattern[weekdayIdx].jointWorkUserId || null;
      } else {
        // Default weekends to WEEK_OFF if not specified in pattern
        if (weekdayIdx === 0 || weekdayIdx === 6) {
          dayType = 'WEEK_OFF';
          territoryId = null;
        }
      }

      if (weekdayIdx === 0) {
        dayType = 'WEEK_OFF';
        territoryId = null;
        jointWorkUserId = null;
        jointWorkUserName = null;
      }

      // Resolve territory names
      let territoryName = null;
      if (territoryId) {
        const u = orgUnitsMap[territoryId] || { name: territoryId };
        territoryName = u.name;
      }

      generatedDays.push({
        planDate: dateStr,
        dayType,
        territoryId,
        territoryName,
        jointWorkUserId,
        jointWorkUserName,
        remarks,
        sequence: dayNum
      });
    }

    // 7. Place visits day-by-day
    for (const day of generatedDays) {
      const { planDate, dayType, territoryId } = day;
      const isFieldDay = dayType === 'FIELD_WORK' || dayType === 'JOINT_FIELD_WORK';

      // Load preserved existing activities for this date
      const preservedActs = existingActs.filter(act => {
        const actDate = act.tourPlanDayId.split('_').pop();
        return actDate === planDate;
      });

      // Keep tracked activities
      let dailyDocCount = preservedActs.filter(a => a.activityType === 'DOCTOR_VISIT').length;
      let dailyInstCount = preservedActs.filter(a => a.activityType === 'INSTITUTION_VISIT').length;

      // Seed time slot
      let currentSlotTime = startTimeStr;
      if (preservedActs.length > 0) {
        // find max planned time of existing to offset new ones
        const times = preservedActs
          .map(a => a.plannedTime)
          .filter(Boolean)
          .sort();
        if (times.length > 0) {
          currentSlotTime = incrementTime(times[times.length - 1], spacingMinutes);
        }
        
        // Push existing activities into output
        preservedActs.forEach(act => {
          generatedActivities.push({
            planDate,
            activityType: act.activityType,
            doctorId: act.doctorId || null,
            doctorName: act.doctorName || null,
            institutionId: act.institutionId || null,
            institutionName: act.institutionName || null,
            practiceLocationId: act.practiceLocationId || null,
            objective: act.objective || null,
            plannedTime: act.plannedTime || null,
            remarks: act.remarks || null,
            source: act.source || 'MANUAL' // preserve original source if available
          });
        });
      }

      if (!isFieldDay || !territoryId) {
        continue; // Skip non-field days
      }

      // A. Distribute Doctors matching this day's territory
      const matchingDocs = doctorsList.filter(d => d.primaryTerritoryId === territoryId);
      
      for (const doc of matchingDocs) {
        // Check day capacity limit
        if (dailyDocCount >= maxDocPerDay) {
          warnings.push({ planDate, message: `Doctor daily capacity limit of ${maxDocPerDay} reached on territory "${day.territoryName || territoryId}".` });
          break; 
        }

        const frequencyLimit = parseInt(doc.visitFrequency, 10) || 1;
        const currentPlanned = plannedDocFrequency[doc.id] || 0;
        
        // Skip if already planned enough times
        if (currentPlanned >= frequencyLimit) {
          continue;
        }

        // Validate Preferred Visit Day matches (or is empty/not configured)
        if (doc.preferredVisitDays && doc.preferredVisitDays.length > 0) {
          const weekdayIdx = new Date(planDate).getDay();
          const weekdaysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = weekdaysMap[weekdayIdx];
          if (!doc.preferredVisitDays.includes(dayName)) {
            continue; // Skip: doesn't match preferred visit weekday
          }
        }

        // Prevent duplicates on the exact same date
        const alreadyPlannedOnDate = generatedActivities.some(a => a.planDate === planDate && a.doctorId === doc.id);
        if (alreadyPlannedOnDate) {
          continue;
        }

        // Find active practice location inside day territory
        const practiceLoc = doc.practiceLocations?.find(l => l.territoryId === territoryId) || doc.practiceLocations?.[0];
        if (!practiceLoc) {
          warnings.push({ planDate, message: `Doctor "${doc.displayName}" has no active practice locations assigned to territory "${day.territoryName || territoryId}".` });
          continue;
        }

        // Allocate doctor visit
        generatedActivities.push({
          planDate,
          activityType: 'DOCTOR_VISIT',
          doctorId: doc.id,
          doctorName: doc.displayName,
          practiceLocationId: practiceLoc.id,
          plannedTime: currentSlotTime,
          objective: 'Routine Doctor Detailing Visit',
          source: 'QUICK_BUILDER'
        });

        dailyDocCount++;
        plannedDocFrequency[doc.id] = (plannedDocFrequency[doc.id] || 0) + 1;
        currentSlotTime = incrementTime(currentSlotTime, spacingMinutes);
      }

      // B. Distribute Institutions matching this day's territory
      const matchingInsts = instList.filter(i => i.territoryId === territoryId);
      for (const inst of matchingInsts) {
        if (dailyInstCount >= maxInstPerDay) {
          warnings.push({ planDate, message: `Institution daily capacity limit of ${maxInstPerDay} reached on territory "${day.territoryName || territoryId}".` });
          break;
        }

        const frequencyLimit = 1; // Default institution visit frequency is typically 1 per month
        const currentPlanned = plannedInstFrequency[inst.id] || 0;

        if (currentPlanned >= frequencyLimit) {
          continue;
        }

        const alreadyPlannedOnDate = generatedActivities.some(a => a.planDate === planDate && a.institutionId === inst.id);
        if (alreadyPlannedOnDate) {
          continue;
        }

        generatedActivities.push({
          planDate,
          activityType: 'INSTITUTION_VISIT',
          institutionId: inst.id,
          institutionName: inst.name,
          plannedTime: currentSlotTime,
          objective: 'Institution Detailing Visit',
          source: 'QUICK_BUILDER'
        });

        dailyInstCount++;
        plannedInstFrequency[inst.id] = (plannedInstFrequency[inst.id] || 0) + 1;
        currentSlotTime = incrementTime(currentSlotTime, spacingMinutes);
      }
    }

    // 8. Track skipped doctors / institutions that could not be fully planned
    doctorsList.forEach(doc => {
      const reqFreq = parseInt(doc.visitFrequency, 10) || 1;
      const actFreq = plannedDocFrequency[doc.id] || 0;
      if (actFreq < reqFreq) {
        skipped.push({
          id: doc.id,
          name: doc.displayName,
          type: 'DOCTOR',
          requestedFrequency: reqFreq,
          plannedFrequency: actFreq,
          reason: 'Insufficient matching field days or daily capacity reached.'
        });
      }
    });

    instList.forEach(inst => {
      const reqFreq = 1;
      const actFreq = plannedInstFrequency[inst.id] || 0;
      if (actFreq < reqFreq) {
        skipped.push({
          id: inst.id,
          name: inst.name,
          type: 'INSTITUTION',
          requestedFrequency: reqFreq,
          plannedFrequency: actFreq,
          reason: 'Insufficient matching field days or daily capacity reached.'
        });
      }
    });

    return {
      days: generatedDays,
      activities: generatedActivities,
      skipped,
      warnings
    };
  },

  /**
   * Apply preview to a draft Tour Plan
   */
  async applyGeneratedPreview(planId, payload, actor) {
    const { days = [], activities = [], mode = 'MERGE' } = payload;
    
    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) {
      throw new CrmServiceError('Tour plan not found.', 404);
    }

    if (plan.status !== 'DRAFT' && plan.status !== 'CHANGES_REQUESTED') {
      throw new CrmServiceError(`Cannot edit a plan in status ${plan.status}.`, 400);
    }

    if (plan.mrId !== actor.id && actor.role !== 'admin') {
      throw new CrmServiceError('Forbidden: You do not own this plan.', 403);
    }

    // Enforce optimistic concurrency check
    if (plan.version !== payload.version) {
      throw new CrmServiceError('Tour plan version mismatch. The plan has been modified by another process.', 409);
    }

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);
      
      // Perform writes of each day and its activities
      for (const day of days) {
        const dayDate = day.planDate;
        const dayId = `${planId}_${dayDate}`;
        const dayRef = db.collection('tourPlanDays').doc(dayId);

        // Fetch existing day plan state in transaction
        const existingDaySnap = await transaction.get(dayRef);
        const dayPayload = {
          tourPlanId: planId,
          planDate: dayDate,
          dayType: day.dayType,
          territoryId: day.territoryId || null,
          territoryName: day.territoryName || null,
          jointWorkUserId: day.jointWorkUserId || null,
          jointWorkUserName: day.jointWorkUserName || null,
          remarks: day.remarks || null,
          sequence: day.sequence || 1,
          updatedAt: new Date().toISOString()
        };

        if (!existingDaySnap.exists) {
          dayPayload.createdAt = new Date().toISOString();
        }
        transaction.set(dayRef, dayPayload, { merge: true });

        // Clean out existing activities for this day if mode is REPLACE
        if (mode === 'REPLACE') {
          const actsQuery = db.collection('tourPlanActivities').where('tourPlanDayId', '==', dayId);
          const actsSnap = await transaction.get(actsQuery);
          actsSnap.forEach(doc => {
            transaction.delete(doc.ref);
          });
        }
      }

      // Add activities
      const actsToInsert = activities.filter(act => {
        if (mode === 'MERGE') {
          // In MERGE mode, only write activities generated by QUICK_BUILDER
          return act.source === 'QUICK_BUILDER';
        }
        return true;
      });

      for (let i = 0; i < actsToInsert.length; i++) {
        const act = actsToInsert[i];
        const dayId = `${planId}_${act.planDate}`;
        const actRef = db.collection('tourPlanActivities').doc();

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
          plannedTime: act.plannedTime || null,
          remarks: act.remarks || null,
          sequence: i + 1,
          source: act.source || 'QUICK_BUILDER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        transaction.set(actRef, actPayload);
      }

      // Increment version
      const nextVersion = plan.version + 1;
      transaction.update(planRef, {
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      });
    });

    return { success: true };
  },

  /**
   * Save configurations for multiple days in bulk
   */
  async saveBulkDays(planId, payload, actor) {
    const { dates = [], dayType, territoryId, jointWorkUserId, remarks, version } = payload;

    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) throw new CrmServiceError('Tour plan not found.', 404);

    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(plan.status)) {
      throw new CrmServiceError(`Cannot edit plan in status ${plan.status}.`, 400);
    }

    if (plan.mrId !== actor.id && actor.role !== 'admin') {
      throw new CrmServiceError('Forbidden: Access denied.', 403);
    }

    if (plan.version !== version) {
      throw new CrmServiceError('Concurrency conflict: Plan has been modified.', 409);
    }

    let jointWorkUserName = null;
    if (jointWorkUserId) {
      const userSnap = await db.collection('users').doc(jointWorkUserId).get();
      if (userSnap.exists) {
        jointWorkUserName = userSnap.data().name || jointWorkUserId;
      }
    }

    let territoryName = null;
    if (territoryId) {
      const unitSnap = await db.collection('organizationUnits').doc(territoryId).get();
      if (unitSnap.exists) {
        territoryName = unitSnap.data().name || territoryId;
      }
    }

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);

      for (const dStr of dates) {
        const dayId = `${planId}_${dStr}`;
        const dayRef = db.collection('tourPlanDays').doc(dayId);
        const daySnap = await transaction.get(dayRef);

        const dayPayload = {
          tourPlanId: planId,
          planDate: dStr,
          dayType,
          territoryId: territoryId || null,
          territoryName: territoryName || null,
          jointWorkUserId: jointWorkUserId || null,
          jointWorkUserName: jointWorkUserName || null,
          remarks: remarks || null,
          updatedAt: new Date().toISOString()
        };

        if (!daySnap.exists) {
          dayPayload.createdAt = new Date().toISOString();
        }

        transaction.set(dayRef, dayPayload, { merge: true });

        // If changed to non-field day, remove all activities
        if (!['FIELD_WORK', 'JOINT_FIELD_WORK'].includes(dayType)) {
          const actsQuery = db.collection('tourPlanActivities').where('tourPlanDayId', '==', dayId);
          const actsSnap = await transaction.get(actsQuery);
          actsSnap.forEach(doc => {
            transaction.delete(doc.ref);
          });
        }
      }

      transaction.update(planRef, {
        version: plan.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      });
    });

    await crmTourPlanService.recalculateSummary(planId);
    return { success: true };
  },

  /**
   * Distribute multiple doctor/institution visits across multiple days
   */
  async distributeActivities(planId, payload, actor) {
    const { dates = [], doctorIds = [], institutionIds = [], version } = payload;

    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) throw new CrmServiceError('Tour plan not found.', 404);

    if (plan.version !== version) {
      throw new CrmServiceError('Concurrency conflict: Plan has been modified.', 409);
    }

    const days = await crmTourPlanRepository.getPlanDays(planId);
    const validFieldDays = days.filter(d => 
      dates.includes(d.planDate) && 
      ['FIELD_WORK', 'JOINT_FIELD_WORK'].includes(d.dayType)
    );

    if (validFieldDays.length === 0) {
      throw new CrmServiceError('No valid Field Work days found for distribution.', 400);
    }

    const doctors = [];
    for (const dId of doctorIds) {
      const dObj = await crmDoctorRepository.getById(dId);
      if (dObj) doctors.push(dObj);
    }

    const institutions = [];
    for (const iId of institutionIds) {
      const iObj = await crmInstitutionRepository.getById(iId);
      if (iObj) institutions.push(iObj);
    }

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);

      // Loop over dates
      for (const day of validFieldDays) {
        const dayId = `${planId}_${day.planDate}`;
        const dayActsQuery = db.collection('tourPlanActivities').where('tourPlanDayId', '==', dayId);
        const dayActsSnap = await transaction.get(dayActsQuery);
        
        let dailyDocCount = 0;
        let dailyInstCount = 0;
        dayActsSnap.forEach(doc => {
          const act = doc.data();
          if (act.activityType === 'DOCTOR_VISIT') dailyDocCount++;
          if (act.activityType === 'INSTITUTION_VISIT') dailyInstCount++;
        });

        // Distribute matching doctors up to daily limit (5)
        const dayDocs = doctors.filter(d => d.primaryTerritoryId === day.territoryId);
        for (const doc of dayDocs) {
          if (dailyDocCount >= 5) break;

          // Prevent exact duplicate visit on same day
          let exists = false;
          dayActsSnap.forEach(docSnap => {
            if (docSnap.data().doctorId === doc.id) exists = true;
          });
          if (exists) continue;

          // Locate practice location
          const plocsSnap = await db.collection('doctorPracticeLocations')
            .where('doctorId', '==', doc.id)
            .where('territoryId', '==', day.territoryId)
            .where('activeStatus', '==', 'ACTIVE')
            .get();
          
          const plocId = plocsSnap.empty ? null : plocsSnap.docs[0].id;

          const actRef = db.collection('tourPlanActivities').doc();
          transaction.set(actRef, {
            tourPlanId: planId,
            tourPlanDayId: dayId,
            activityType: 'DOCTOR_VISIT',
            doctorId: doc.id,
            doctorName: doc.displayName,
            practiceLocationId: plocId,
            objective: 'Bulk Distributed Visit',
            source: 'MANUAL',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          dailyDocCount++;
        }

        // Distribute matching institutions up to daily limit (2)
        const dayInsts = institutions.filter(i => i.territoryId === day.territoryId);
        for (const inst of dayInsts) {
          if (dailyInstCount >= 2) break;

          let exists = false;
          dayActsSnap.forEach(docSnap => {
            if (docSnap.data().institutionId === inst.id) exists = true;
          });
          if (exists) continue;

          const actRef = db.collection('tourPlanActivities').doc();
          transaction.set(actRef, {
            tourPlanId: planId,
            tourPlanDayId: dayId,
            activityType: 'INSTITUTION_VISIT',
            institutionId: inst.id,
            institutionName: inst.name,
            objective: 'Bulk Distributed Visit',
            source: 'MANUAL',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          dailyInstCount++;
        }
      }

      transaction.update(planRef, {
        version: plan.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      });
    });

    await crmTourPlanService.recalculateSummary(planId);
    return { success: true };
  },

  /**
   * Distribute unplanned doctors across the plan's field days
   */
  async regenerateUnplanned(planId, payload, actor) {
    const { version } = payload;
    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) throw new CrmServiceError('Tour plan not found.', 404);

    if (plan.version !== version) {
      throw new CrmServiceError('Concurrency conflict: Plan has been modified.', 409);
    }

    // Resolve assigned territories
    const todayStr = new Date().toISOString().split('T')[0];
    const terrSnap = await db.collection('territoryAssignments')
      .where('employeeId', '==', plan.mrId)
      .where('status', '==', 'ACTIVE')
      .get();
    
    const territoryIds = [];
    terrSnap.forEach(d => {
      const data = d.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        territoryIds.push(data.territoryId);
      }
    });

    if (territoryIds.length === 0) {
      throw new CrmServiceError('No active territory assignments found.', 400);
    }

    // Load active doctors
    const doctorsSnap = await db.collection('doctors')
      .where('activeStatus', '==', 'ACTIVE')
      .where('primaryTerritoryId', 'in', territoryIds.slice(0, 30))
      .get();

    const doctors = [];
    doctorsSnap.forEach(doc => doctors.push({ id: doc.id, ...doc.data() }));

    const activities = await crmTourPlanRepository.getPlanActivities(planId);
    const plannedDocIds = new Set(activities.map(a => a.doctorId).filter(Boolean));

    // Filter unplanned doctors
    const unplannedDoctors = doctors.filter(d => !plannedDocIds.has(d.id));
    if (unplannedDoctors.length === 0) {
      return { success: true, message: 'All doctors are already planned.' };
    }

    const days = await crmTourPlanRepository.getPlanDays(planId);
    const fieldDays = days.filter(d => ['FIELD_WORK', 'JOINT_FIELD_WORK'].includes(d.dayType));

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);

      for (const d of fieldDays) {
        const dayId = `${planId}_${d.planDate}`;
        const dayActsQuery = db.collection('tourPlanActivities').where('tourPlanDayId', '==', dayId);
        const dayActsSnap = await transaction.get(dayActsQuery);

        let docCount = 0;
        dayActsSnap.forEach(docSnap => {
          if (docSnap.data().activityType === 'DOCTOR_VISIT') docCount++;
        });

        const matchDocs = unplannedDoctors.filter(ud => ud.primaryTerritoryId === d.territoryId);
        for (const doc of matchDocs) {
          if (docCount >= 5) break;

          // Prevent double planning
          let isDocAlreadyPlanned = false;
          const acts = await crmTourPlanRepository.getPlanActivities(planId);
          if (acts.some(a => a.doctorId === doc.id)) {
            isDocAlreadyPlanned = true;
          }
          if (isDocAlreadyPlanned) continue;

          // Resolve practice location
          const plocsSnap = await db.collection('doctorPracticeLocations')
            .where('doctorId', '==', doc.id)
            .where('territoryId', '==', d.territoryId)
            .where('activeStatus', '==', 'ACTIVE')
            .get();
          
          const plocId = plocsSnap.empty ? null : plocsSnap.docs[0].id;

          const actRef = db.collection('tourPlanActivities').doc();
          transaction.set(actRef, {
            tourPlanId: planId,
            tourPlanDayId: dayId,
            activityType: 'DOCTOR_VISIT',
            doctorId: doc.id,
            doctorName: doc.displayName,
            practiceLocationId: plocId,
            objective: 'Regenerated Unplanned Doctor Visit',
            source: 'QUICK_BUILDER',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          docCount++;
          
          // Remove from local list so it isn't scheduled again
          const idx = unplannedDoctors.findIndex(ud => ud.id === doc.id);
          if (idx !== -1) unplannedDoctors.splice(idx, 1);
        }
      }

      transaction.update(planRef, {
        version: plan.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      });
    });

    await crmTourPlanService.recalculateSummary(planId);
    return { success: true };
  }
};
