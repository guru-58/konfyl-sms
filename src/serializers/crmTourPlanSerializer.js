export const serializeTourPlan = (plan, isAdmin = false) => {
  if (!plan) return null;
  const res = {
    id: plan.id,
    mrId: plan.mrId,
    mrName: plan.mrName || null,
    mrEmail: plan.mrEmail || null,
    monthKey: plan.monthKey,
    status: plan.status,
    revisionNumber: plan.revisionNumber || 1,
    approverId: plan.approverId || null,
    approverName: plan.approverName || null,
    approverRole: plan.approverRole || null,
    reportingAssignmentId: plan.reportingAssignmentId || null,
    summary: plan.summary || {
      plannedFieldDays: 0,
      plannedDoctorVisits: 0,
      plannedInstitutionVisits: 0,
      plannedJointWorkDays: 0,
      plannedNonFieldDays: 0
    },
    submittedAt: plan.submittedAt || null,
    submittedBy: plan.submittedBy || null,
    approvedAt: plan.approvedAt || null,
    approvedBy: plan.approvedBy || null,
    lastManagerComment: plan.lastManagerComment || null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    version: plan.version || 1
  };
  return res;
};

export const serializeTourPlanDay = (day) => {
  if (!day) return null;
  return {
    id: day.id,
    tourPlanId: day.tourPlanId,
    planDate: day.planDate,
    dayType: day.dayType,
    territoryId: day.territoryId || null,
    territoryName: day.territoryName || null,
    headquartersId: day.headquartersId || null,
    jointWorkUserId: day.jointWorkUserId || null,
    jointWorkUserName: day.jointWorkUserName || null,
    workLocationText: day.workLocationText || null,
    remarks: day.remarks || null,
    sequence: day.sequence || 0,
    createdAt: day.createdAt,
    updatedAt: day.updatedAt
  };
};

export const serializeTourPlanActivity = (act) => {
  if (!act) return null;
  return {
    id: act.id,
    tourPlanId: act.tourPlanId,
    tourPlanDayId: act.tourPlanDayId,
    activityType: act.activityType,
    doctorId: act.doctorId || null,
    doctorName: act.doctorName || null,
    institutionId: act.institutionId || null,
    institutionName: act.institutionName || null,
    practiceLocationId: act.practiceLocationId || null,
    objective: act.objective || null,
    sequence: act.sequence || 0,
    plannedTime: act.plannedTime || null,
    remarks: act.remarks || null
  };
};

export const serializeTourPlanRevision = (rev) => {
  if (!rev) return null;
  return {
    id: rev.id,
    tourPlanId: rev.tourPlanId,
    revisionNumber: rev.revisionNumber,
    snapshot: rev.snapshot || null,
    submittedAt: rev.submittedAt,
    submittedBy: rev.submittedBy,
    outcome: rev.outcome || null,
    managerComment: rev.managerComment || null,
    resolvedAt: rev.resolvedAt || null,
    resolvedBy: rev.resolvedBy || null,
    createdAt: rev.createdAt
  };
};

export const serializeTourPlanComment = (comm) => {
  if (!comm) return null;
  return {
    id: comm.id,
    tourPlanId: comm.tourPlanId,
    revisionNumber: comm.revisionNumber || null,
    commentType: comm.commentType,
    comment: comm.comment,
    createdBy: comm.createdBy,
    createdByName: comm.createdByName || null,
    createdByRole: comm.createdByRole,
    createdAt: comm.createdAt
  };
};
