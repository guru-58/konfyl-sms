const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MOBILE_REGEX = /^\+?[0-9\s\-()]{10,20}$/;
const CODE_REGEX = /^[A-Z0-9_-]{2,20}$/;

export const validateOrgUnitInput = (data) => {
  const errors = {};

  if (!data.code || typeof data.code !== 'string') {
    errors.code = 'Code is required and must be a string.';
  } else {
    const codeVal = data.code.toUpperCase().trim();
    if (!CODE_REGEX.test(codeVal)) {
      errors.code = 'Code must be 2-20 characters, alphanumeric, uppercase, hyphens/underscores only.';
    }
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.name = 'Name is required and must be at least 2 characters.';
  } else if (data.name.length > 100) {
    errors.name = 'Name must not exceed 100 characters.';
  }

  const validTypes = ['ZONE', 'REGION', 'HEADQUARTERS', 'TERRITORY'];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.type = `Type must be one of: ${validTypes.join(', ')}.`;
  }

  // Parent validations based on hierarchy rules
  if (data.type === 'ZONE') {
    if (data.parentId) {
      errors.parentId = 'Zone cannot have a parent unit.';
    }
  } else {
    if (!data.parentId) {
      errors.parentId = 'Parent ID is required for sub-units.';
    }
    const validParentTypes = {
      REGION: 'ZONE',
      HEADQUARTERS: 'REGION',
      TERRITORY: 'HEADQUARTERS'
    };
    if (data.parentType !== validParentTypes[data.type]) {
      errors.parentType = `Parent of ${data.type} must be of type ${validParentTypes[data.type]}.`;
    }
  }

  if (data.pincodes !== undefined) {
    if (!Array.isArray(data.pincodes)) {
      errors.pincodes = 'Pincodes must be an array of strings.';
    } else {
      const invalid = data.pincodes.filter(p => typeof p !== 'string' || p.trim().length < 3);
      if (invalid.length > 0) {
        errors.pincodes = 'Each pincode must be a string of at least 3 characters.';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateReportingAssignmentInput = (data) => {
  const errors = {};

  if (!data.employeeId) {
    errors.employeeId = 'Employee ID is required.';
  }

  const validEmployeeRoles = ['mr', 'rsm', 'zsm'];
  if (!data.employeeRole || !validEmployeeRoles.includes(data.employeeRole)) {
    errors.employeeRole = 'Employee role must be mr, rsm, or zsm.';
  }

  if (data.employeeRole === 'zsm') {
    // ZSM reports to Admin/Org level (no managerId required)
    if (data.managerId) {
      errors.managerId = 'ZSM users report directly to organization/admin level. Manager ID should be empty.';
    }
  } else {
    if (!data.managerId) {
      errors.managerId = 'Manager ID is required.';
    }
    
    // RSM reports to ZSM. MR reports to RSM.
    if (data.employeeRole === 'mr' && data.managerRole !== 'rsm') {
      errors.managerRole = 'MR reporting assignments must have an RSM manager.';
    }
    if (data.employeeRole === 'rsm' && data.managerRole !== 'zsm') {
      errors.managerRole = 'RSM reporting assignments must have a ZSM manager.';
    }
  }

  if (!data.effectiveFrom) {
    errors.effectiveFrom = 'Effective From date is required (YYYY-MM-DD).';
  } else if (isNaN(Date.parse(data.effectiveFrom))) {
    errors.effectiveFrom = 'Effective From is an invalid date format.';
  }

  if (data.effectiveTo) {
    if (isNaN(Date.parse(data.effectiveTo))) {
      errors.effectiveTo = 'Effective To is an invalid date format.';
    } else if (new Date(data.effectiveTo) < new Date(data.effectiveFrom)) {
      errors.effectiveTo = 'Effective To date cannot be earlier than Effective From date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateTerritoryAssignmentInput = (data) => {
  const errors = {};

  if (!data.territoryId) {
    errors.territoryId = 'Organization unit/territory ID is required.';
  }
  if (!data.employeeId) {
    errors.employeeId = 'Employee ID is required.';
  }

  const validRoles = ['mr', 'rsm', 'zsm'];
  if (!data.employeeRole || !validRoles.includes(data.employeeRole)) {
    errors.employeeRole = 'Employee role must be mr, rsm, or zsm.';
  }

  const validTypes = ['PRIMARY', 'SECONDARY', 'TEMPORARY'];
  if (!data.assignmentType || !validTypes.includes(data.assignmentType)) {
    errors.assignmentType = 'Assignment type must be PRIMARY, SECONDARY, or TEMPORARY.';
  }

  if (!data.effectiveFrom) {
    errors.effectiveFrom = 'Effective From date is required.';
  } else if (isNaN(Date.parse(data.effectiveFrom))) {
    errors.effectiveFrom = 'Effective From date is invalid.';
  }

  if (data.effectiveTo) {
    if (isNaN(Date.parse(data.effectiveTo))) {
      errors.effectiveTo = 'Effective To date is invalid.';
    } else if (new Date(data.effectiveTo) < new Date(data.effectiveFrom)) {
      errors.effectiveTo = 'Effective To date cannot be earlier than Effective From.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateDoctorInput = (data) => {
  const errors = {};

  if (data.doctorCode) {
    const codeVal = data.doctorCode.toUpperCase().trim();
    if (!CODE_REGEX.test(codeVal)) {
      errors.doctorCode = 'Doctor code must be alphanumeric and 2-20 characters.';
    }
  }

  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
    errors.firstName = 'First Name is required.';
  }
  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
    errors.lastName = 'Last Name is required.';
  }

  if (!data.specialtyCode || typeof data.specialtyCode !== 'string') {
    errors.specialtyCode = 'Specialty is required.';
  }

  if (!data.primaryTerritoryId) {
    errors.primaryTerritoryId = 'Primary Territory is required.';
  }

  const validClassifications = ['A', 'B', 'C'];
  if (data.classification && !validClassifications.includes(data.classification)) {
    errors.classification = 'Classification must be A, B, or C.';
  }

  if (data.contact) {
    const { email, mobile } = data.contact;
    if (email && !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Invalid email address format.';
    }
    if (mobile && !MOBILE_REGEX.test(mobile.trim())) {
      errors.mobile = 'Invalid mobile number format (minimum 10 digits).';
    }
  }

  if (data.visitFrequency) {
    const freq = parseInt(data.visitFrequency, 10);
    if (isNaN(freq) || freq < 1 || freq > 30) {
      errors.visitFrequency = 'Visit frequency must be a number between 1 and 30.';
    }
  }

  if (data.preferredVisitDays !== undefined && !Array.isArray(data.preferredVisitDays)) {
    errors.preferredVisitDays = 'Preferred visit days must be an array.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateInstitutionInput = (data) => {
  const errors = {};

  if (data.institutionCode) {
    const codeVal = data.institutionCode.toUpperCase().trim();
    if (!CODE_REGEX.test(codeVal)) {
      errors.institutionCode = 'Institution code must be alphanumeric and 2-20 characters.';
    }
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.name = 'Institution name is required.';
  }

  const validTypes = ['CLINIC', 'HOSPITAL', 'NURSING_HOME', 'PHARMACY', 'DIAGNOSTIC_CENTRE', 'OTHER'];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.type = `Institution type must be one of: ${validTypes.join(', ')}.`;
  }

  if (!data.territoryId) {
    errors.territoryId = 'Territory is required.';
  }

  if (data.address) {
    const { line1, city, state, pincode } = data.address;
    if (!line1 || line1.trim().length === 0) {
      errors.addressLine1 = 'Address Line 1 is required.';
    }
    if (!city || city.trim().length === 0) {
      errors.city = 'City is required.';
    }
    if (!state || state.trim().length === 0) {
      errors.state = 'State is required.';
    }
    if (!pincode || pincode.trim().length === 0) {
      errors.pincode = 'Pincode is required.';
    }
  } else {
    errors.address = 'Address information is required.';
  }

  if (data.contact) {
    const { email, phone } = data.contact;
    if (email && !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Invalid contact email format.';
    }
    if (phone && !MOBILE_REGEX.test(phone.trim())) {
      errors.phone = 'Invalid contact phone format.';
    }
  }

  if (data.latitude !== undefined && data.latitude !== null) {
    const lat = parseFloat(data.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be between -90 and 90.';
    }
  }

  if (data.longitude !== undefined && data.longitude !== null) {
    const lon = parseFloat(data.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      errors.longitude = 'Longitude must be between -180 and 180.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validatePracticeLocationInput = (data) => {
  const errors = {};

  if (!data.doctorId) {
    errors.doctorId = 'Doctor ID is required.';
  }
  if (!data.institutionId) {
    errors.institutionId = 'Institution ID is required.';
  }
  if (!data.territoryId) {
    errors.territoryId = 'Territory ID is required.';
  }

  if (data.consultationDays !== undefined && !Array.isArray(data.consultationDays)) {
    errors.consultationDays = 'Consultation days must be an array of strings.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateSpecialtyInput = (data) => {
  const errors = {};

  if (!data.code || typeof data.code !== 'string') {
    errors.code = 'Code is required.';
  } else {
    const codeVal = data.code.toLowerCase().trim();
    if (!/^[a-z0-9_-]{2,30}$/.test(codeVal)) {
      errors.code = 'Specialty code must be lowercase alphanumeric (2-30 characters, hyphens/underscores allowed).';
    }
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.name = 'Specialty name is required.';
  }

  if (data.sortOrder !== undefined) {
    const order = parseInt(data.sortOrder, 10);
    if (isNaN(order) || order < 0) {
      errors.sortOrder = 'Sort order must be a non-negative number.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
