export const serializeOrgUnit = (unit, isAdmin = false) => {
  if (!unit) return null;
  const activeStatus = unit.activeStatus || (unit.active === false ? 'INACTIVE' : 'ACTIVE');
  const res = {
    id: unit.id,
    code: unit.code,
    name: unit.name,
    type: unit.type,
    parentId: unit.parentId || null,
    parentType: unit.parentType || null,
    state: unit.state || null,
    city: unit.city || null,
    pincodes: unit.pincodes || [],
    description: unit.description || null,
    activeStatus,
    active: activeStatus === 'ACTIVE',   // convenience boolean for legacy consumers
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt
  };
  if (isAdmin) {
    res.createdBy = unit.createdBy || null;
    res.updatedBy = unit.updatedBy || null;
  }
  return res;
};

export const serializeReportingAssignment = (assign, isAdmin = false) => {
  if (!assign) return null;
  const res = {
    id: assign.id,
    employeeId: assign.employeeId,
    employeeName: assign.employeeName || null,
    employeeEmail: assign.employeeEmail || null,
    employeeRole: assign.employeeRole,
    managerId: assign.managerId || null,
    managerName: assign.managerName || null,
    managerEmail: assign.managerEmail || null,
    managerRole: assign.managerRole || null,
    effectiveFrom: assign.effectiveFrom,
    effectiveTo: assign.effectiveTo || null,
    isPrimary: assign.isPrimary === undefined ? true : !!assign.isPrimary,
    status: assign.status || 'ACTIVE',
    createdAt: assign.createdAt,
    updatedAt: assign.updatedAt
  };
  if (isAdmin) {
    res.createdBy = assign.createdBy || null;
    res.updatedBy = assign.updatedBy || null;
  }
  return res;
};

export const serializeTerritoryAssignment = (assign, isAdmin = false) => {
  if (!assign) return null;
  const res = {
    id: assign.id,
    territoryId: assign.territoryId,
    territoryCode: assign.territoryCode || null,
    territoryName: assign.territoryName || null,
    employeeId: assign.employeeId,
    employeeName: assign.employeeName || null,
    employeeEmail: assign.employeeEmail || null,
    employeeRole: assign.employeeRole,
    assignmentType: assign.assignmentType || 'PRIMARY',
    effectiveFrom: assign.effectiveFrom,
    effectiveTo: assign.effectiveTo || null,
    status: assign.status || 'ACTIVE',
    createdAt: assign.createdAt,
    updatedAt: assign.updatedAt
  };
  if (isAdmin) {
    res.createdBy = assign.createdBy || null;
    res.updatedBy = assign.updatedBy || null;
  }
  return res;
};

export const serializeDoctor = (doctor, isAdmin = false) => {
  if (!doctor) return null;
  const res = {
    id: doctor.id,
    doctorCode: doctor.doctorCode || null,
    title: doctor.title || 'Dr.',
    firstName: doctor.firstName,
    middleName: doctor.middleName || null,
    lastName: doctor.lastName,
    displayName: doctor.displayName || `${doctor.title || 'Dr.'} ${doctor.firstName} ${doctor.lastName}`,
    specialtyCode: doctor.specialtyCode,
    specialtyName: doctor.specialtyName || null,
    qualifications: doctor.qualifications || null,
    registrationNumber: doctor.registrationNumber || null,
    contact: doctor.contact ? {
      mobile: doctor.contact.mobile || null,
      alternateMobile: doctor.contact.alternateMobile || null,
      email: doctor.contact.email || null
    } : { mobile: null, alternateMobile: null, email: null },
    primaryTerritoryId: doctor.primaryTerritoryId,
    primaryTerritoryName: doctor.primaryTerritoryName || null,
    classification: doctor.classification || 'B',
    visitFrequency: doctor.visitFrequency || 1,
    preferredVisitDays: doctor.preferredVisitDays || [],
    preferredVisitTime: doctor.preferredVisitTime || null,
    activeStatus: doctor.activeStatus || 'ACTIVE',
    notes: doctor.notes || null,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt
  };
  if (isAdmin) {
    res.createdBy = doctor.createdBy || null;
    res.updatedBy = doctor.updatedBy || null;
  }
  return res;
};

export const serializeInstitution = (inst, isAdmin = false) => {
  if (!inst) return null;
  const res = {
    id: inst.id,
    institutionCode: inst.institutionCode || null,
    name: inst.name,
    type: inst.type || 'HOSPITAL',
    address: inst.address ? {
      line1: inst.address.line1,
      line2: inst.address.line2 || null,
      landmark: inst.address.landmark || null,
      city: inst.address.city,
      state: inst.address.state,
      pincode: inst.address.pincode
    } : null,
    territoryId: inst.territoryId,
    territoryName: inst.territoryName || null,
    contact: inst.contact ? {
      phone: inst.contact.phone || null,
      email: inst.contact.email || null
    } : { phone: null, email: null },
    latitude: inst.latitude || null,
    longitude: inst.longitude || null,
    activeStatus: inst.activeStatus || 'ACTIVE',
    notes: inst.notes || null,
    createdAt: inst.createdAt,
    updatedAt: inst.updatedAt
  };
  if (isAdmin) {
    res.createdBy = inst.createdBy || null;
    res.updatedBy = inst.updatedBy || null;
  }
  return res;
};

export const serializePracticeLocation = (loc, isAdmin = false) => {
  if (!loc) return null;
  const res = {
    id: loc.id,
    doctorId: loc.doctorId,
    doctorName: loc.doctorName || null,
    institutionId: loc.institutionId,
    institutionName: loc.institutionName || null,
    territoryId: loc.territoryId || null,
    isPrimary: loc.isPrimary === undefined ? false : !!loc.isPrimary,
    department: loc.department || null,
    consultationDays: loc.consultationDays || [],
    consultationTime: loc.consultationTime || null,
    activeStatus: loc.activeStatus || 'ACTIVE',
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt
  };
  if (isAdmin) {
    res.createdBy = loc.createdBy || null;
    res.updatedBy = loc.updatedBy || null;
  }
  return res;
};

export const serializeSpecialty = (spec, isAdmin = false) => {
  if (!spec) return null;
  const res = {
    id: spec.id,
    code: spec.code,
    name: spec.name,
    description: spec.description || null,
    sortOrder: spec.sortOrder !== undefined ? spec.sortOrder : 999,
    activeStatus: spec.activeStatus || 'ACTIVE',
    createdAt: spec.createdAt,
    updatedAt: spec.updatedAt
  };
  if (isAdmin) {
    res.createdBy = spec.createdBy || null;
    res.updatedBy = spec.updatedBy || null;
  }
  return res;
};

export const serializeAuditLog = (log) => {
  if (!log) return null;
  return {
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    actorUserId: log.actorUserId,
    actorRole: log.actorRole,
    timestamp: log.timestamp,
    summary: log.summary
  };
};
