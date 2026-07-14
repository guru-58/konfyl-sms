import { db } from '../config/firebaseAdmin.js';
import { crmTourPlanRepository } from '../repositories/crmTourPlanRepository.js';
import { crmAuditRepository } from '../repositories/crmAuditRepository.js';
import { crmTourPlanService } from './crmTourPlanService.js';
import { validateAdminOverrideReason } from '../validators/crmTourPlanValidator.js';
import { CrmServiceError } from './crmOrganizationService.js';
import { FieldValue } from 'firebase-admin/firestore';

export const crmTourPlanApprovalService = {
  /**
   * Submit plan to assigned RSM
   */
  async submitPlan(planId, actor) {
    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) throw new CrmServiceError('Tour plan not found.', 404);

    if (plan.mrId !== actor.id) {
      throw new CrmServiceError('Forbidden: You do not own this plan.', 403);
    }

    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(plan.status)) {
      throw new CrmServiceError(`Cannot submit plan in ${plan.status} status.`, 400);
    }

    const days = await crmTourPlanRepository.getPlanDays(planId);
    if (days.length === 0) {
      throw new CrmServiceError('Cannot submit an empty plan. Plan must have at least one day.', 400);
    }

    const activities = await crmTourPlanRepository.getPlanActivities(planId);

    // 1. Resolve active RSM reporting assignment
    const todayStr = new Date().toISOString().split('T')[0];
    const reportAssignmentsSnap = await db.collection('reportingAssignments')
      .where('employeeId', '==', plan.mrId)
      .where('status', '==', 'ACTIVE')
      .get();

    let activeManager = null;
    reportAssignmentsSnap.forEach(doc => {
      const data = doc.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        activeManager = { id: doc.id, ...data };
      }
    });

    if (!activeManager) {
      throw new CrmServiceError('No active RSM reporting assignment is available. Contact the administrator.', 400);
    }

    // 2. Validate Manager is actually RSM
    if (activeManager.managerRole !== 'rsm') {
      throw new CrmServiceError(`Active reporting assignment manager is not an RSM (Role found: ${activeManager.managerRole}).`, 400);
    }

    // 3. Resolve approver display name
    const mgrDoc = await db.collection('users').doc(activeManager.managerId).get();
    if (!mgrDoc.exists) {
      throw new CrmServiceError('Manager user account not found.', 404);
    }
    const managerUser = mgrDoc.data();

    // 4. Build snapshot and validate serialized size limit
    const daySnapshots = days.map(d => ({
      planDate: d.planDate,
      dayType: d.dayType,
      territoryId: d.territoryId,
      territoryName: d.territoryName,
      headquartersId: d.headquartersId,
      jointWorkUserId: d.jointWorkUserId,
      jointWorkUserName: d.jointWorkUserName,
      workLocationText: d.workLocationText,
      remarks: d.remarks
    }));

    const activitySnapshots = activities.map(a => ({
      planDate: a.tourPlanDayId.split('_').pop(), // derive date from day ID
      activityType: a.activityType,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      institutionId: a.institutionId,
      institutionName: a.institutionName,
      practiceLocationId: a.practiceLocationId,
      objective: a.objective,
      sequence: a.sequence,
      plannedTime: a.plannedTime,
      remarks: a.remarks
    }));

    const snapshot = {
      days: daySnapshots,
      activities: activitySnapshots
    };

    const serializedSnapshot = JSON.stringify(snapshot);
    if (serializedSnapshot.length > 153600) { // 150KB limit
      throw new CrmServiceError('Tour plan details size exceeds the maximum allowed snapshot limit of 150KB.', 400);
    }

    // 5. Submit in Transaction
    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);
      const planSnap = await transaction.get(planRef);
      const planData = planSnap.data();

      if (planData.version !== plan.version) {
        throw new CrmServiceError('Plan has been modified. Please refresh.', 409);
      }

      const nextRevision = planData.status === 'CHANGES_REQUESTED' 
        ? (planData.revisionNumber || 1) + 1 
        : (planData.revisionNumber || 1);

      // Create revision record
      const revId = `${planId}_rev_${nextRevision}`;
      const revRef = db.collection('tourPlanRevisions').doc(revId);

      const revisionData = {
        tourPlanId: planId,
        revisionNumber: nextRevision,
        snapshot,
        submittedAt: FieldValue.serverTimestamp(),
        submittedBy: actor.id,
        outcome: null,
        managerComment: null,
        resolvedAt: null,
        resolvedBy: null,
        createdAt: FieldValue.serverTimestamp()
      };

      transaction.set(revRef, revisionData);

      // Update plan fields
      transaction.update(planRef, {
        status: 'SUBMITTED',
        revisionNumber: nextRevision,
        approverId: activeManager.managerId,
        approverName: managerUser.name || activeManager.managerId,
        approverRole: 'rsm',
        reportingAssignmentId: activeManager.id,
        submittedAt: FieldValue.serverTimestamp(),
        submittedBy: actor.id,
        version: planData.version + 1,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.id
      });
    });

    // Recalculate summary
    await crmTourPlanService.recalculateSummary(planId);

    // Audit Logging
    await crmAuditRepository.log({
      entityType: 'TOUR_PLAN',
      entityId: planId,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Submitted Tour Plan for ${plan.monthKey} to RSM ${managerUser.name || activeManager.managerId}.`
    });

    return { success: true };
  },

  /**
   * Request Changes on a submitted plan
   */
  async requestChanges(planId, commentText, actor, isOverride = false, overrideReason = null) {
    if (!commentText || commentText.trim().length === 0) {
      throw new CrmServiceError('A comment is mandatory when requesting changes to a Tour Plan.', 400);
    }

    if (isOverride) {
      const { isValid, errors } = validateAdminOverrideReason(overrideReason);
      if (!isValid) throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);
      const planSnap = await transaction.get(planRef);
      if (!planSnap.exists) throw new CrmServiceError('Tour plan not found.', 404);
      
      const plan = planSnap.data();
      if (plan.status !== 'SUBMITTED') {
        throw new CrmServiceError(`Plan cannot be returned. Status must be SUBMITTED (Found: ${plan.status}).`, 400);
      }

      // Authorization verification
      if (!isOverride && plan.approverId !== actor.id) {
        throw new CrmServiceError('Access denied: You are not the assigned approver for this plan.', 403);
      }

      const currentRevision = plan.revisionNumber || 1;
      const revId = `${planId}_rev_${currentRevision}`;
      const revRef = db.collection('tourPlanRevisions').doc(revId);

      // Update revision SNAPSHOT details
      transaction.update(revRef, {
        outcome: 'CHANGES_REQUESTED',
        managerComment: commentText,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: actor.id
      });

      // Save comment
      const commentRef = db.collection('tourPlanComments').doc();
      transaction.set(commentRef, {
        tourPlanId: planId,
        revisionNumber: currentRevision,
        commentType: isOverride ? 'ADMIN_OVERRIDE' : 'CHANGES_REQUESTED',
        comment: commentText + (isOverride ? ` (Admin Override Reason: ${overrideReason})` : ''),
        createdBy: actor.id,
        createdByName: actor.name || actor.id,
        createdByRole: actor.role,
        createdAt: FieldValue.serverTimestamp()
      });

      // Update plan fields
      transaction.update(planRef, {
        status: 'CHANGES_REQUESTED',
        lastManagerComment: commentText,
        version: plan.version + 1,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.id
      });
    });

    // Audit Logging
    await crmAuditRepository.log({
      entityType: 'TOUR_PLAN',
      entityId: planId,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `${isOverride ? 'Admin Override: ' : ''}Requested changes for plan ${planId}. Comment: "${commentText}"`
    });

    return { success: true };
  },

  /**
   * Approve a submitted plan
   */
  async approvePlan(planId, commentText = '', actor, isOverride = false, overrideReason = null) {
    if (isOverride) {
      const { isValid, errors } = validateAdminOverrideReason(overrideReason);
      if (!isValid) throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);
      const planSnap = await transaction.get(planRef);
      if (!planSnap.exists) throw new CrmServiceError('Tour plan not found.', 404);
      
      const plan = planSnap.data();
      if (plan.status !== 'SUBMITTED') {
        throw new CrmServiceError(`Plan cannot be approved. Status must be SUBMITTED (Found: ${plan.status}).`, 400);
      }

      // Authorization verification
      if (!isOverride && plan.approverId !== actor.id) {
        throw new CrmServiceError('Access denied: You are not the assigned approver for this plan.', 403);
      }

      const currentRevision = plan.revisionNumber || 1;
      const revId = `${planId}_rev_${currentRevision}`;
      const revRef = db.collection('tourPlanRevisions').doc(revId);

      // Update revision SNAPSHOT details
      transaction.update(revRef, {
        outcome: 'APPROVED',
        managerComment: commentText || null,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: actor.id
      });

      // Save comment if provided
      if (commentText) {
        const commentRef = db.collection('tourPlanComments').doc();
        transaction.set(commentRef, {
          tourPlanId: planId,
          revisionNumber: currentRevision,
          commentType: isOverride ? 'ADMIN_OVERRIDE' : 'APPROVAL_COMMENT',
          comment: commentText + (isOverride ? ` (Admin Override Reason: ${overrideReason})` : ''),
          createdBy: actor.id,
          createdByName: actor.name || actor.id,
          createdByRole: actor.role,
          createdAt: FieldValue.serverTimestamp()
        });
      }

      // Update plan fields
      transaction.update(planRef, {
        status: 'APPROVED',
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: actor.id,
        lastManagerComment: commentText || null,
        version: plan.version + 1,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.id
      });
    });

    // Audit Logging
    await crmAuditRepository.log({
      entityType: 'TOUR_PLAN',
      entityId: planId,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `${isOverride ? 'Admin Override: ' : ''}Approved plan ${planId}.`
    });

    return { success: true };
  },

  /**
   * Admin Exceptional Override: Reassign Approver
   */
  async reassignApprover(planId, newApproverId, overrideReason, actor) {
    const { isValid, errors } = validateAdminOverrideReason(overrideReason);
    if (!isValid) throw new CrmServiceError(JSON.stringify(errors), 400);

    const newApprDoc = await db.collection('users').doc(newApproverId).get();
    if (!newApprDoc.exists || newApprDoc.data().role !== 'rsm') {
      throw new CrmServiceError('New approver must be an active RSM manager.', 400);
    }
    const newApprover = newApprDoc.data();

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);
      const planSnap = await transaction.get(planRef);
      if (!planSnap.exists) throw new CrmServiceError('Tour plan not found.', 404);
      
      const plan = planSnap.data();

      // Log override comment
      const commentRef = db.collection('tourPlanComments').doc();
      transaction.set(commentRef, {
        tourPlanId: planId,
        commentType: 'ADMIN_OVERRIDE',
        comment: `Approver reassigned from ${plan.approverName || plan.approverId} to ${newApprover.name || newApproverId}. Reason: ${overrideReason}`,
        createdBy: actor.id,
        createdByName: actor.name || actor.id,
        createdByRole: actor.role,
        createdAt: FieldValue.serverTimestamp()
      });

      // Update planapprover details
      transaction.update(planRef, {
        approverId: newApproverId,
        approverName: newApprover.name || newApproverId,
        version: plan.version + 1,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.id
      });
    });

    // Audit Logging
    await crmAuditRepository.log({
      entityType: 'TOUR_PLAN',
      entityId: planId,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Admin reassigned approver of plan ${planId} to ${newApprover.name || newApproverId}. Reason: ${overrideReason}`
    });

    return { success: true };
  }
};
