import { 
  isValidMonthString, 
  isValidDateString, 
  isValidTimeString, 
  getCurrentBusinessMonthString, 
  isPastMonth, 
  isMonthWithinFutureLimit,
  isDateInMonth
} from '../utils/timezone.js';

const VALID_DAY_TYPES = [
  'FIELD_WORK',
  'JOINT_FIELD_WORK',
  'MEETING',
  'TRAINING',
  'ADMIN_WORK',
  'WEEK_OFF',
  'HOLIDAY',
  'LEAVE'
];

const VALID_ACTIVITY_TYPES = [
  'DOCTOR_VISIT',
  'INSTITUTION_VISIT',
  'FIELD_ACTIVITY',
  'MEETING',
  'OTHER'
];

/**
 * Validate new Tour Plan creation
 */
export const validateTourPlanCreateInput = (data) => {
  const errors = {};

  if (!data.monthKey || !isValidMonthString(data.monthKey)) {
    errors.monthKey = 'Month Key is required and must be in YYYY-MM format.';
  } else {
    const currentMonth = getCurrentBusinessMonthString();
    if (isPastMonth(data.monthKey, currentMonth)) {
      errors.monthKey = 'Planning for past months is not allowed.';
    } else if (!isMonthWithinFutureLimit(data.monthKey, currentMonth, 2)) {
      errors.monthKey = 'Planning is limited to the current month and the next 2 future months.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate a single day plan input (including activities and concurrency version)
 */
export const validateTourPlanDaySaveInput = (data, planDate, monthKey) => {
  const errors = {};

  // Check version (optimistic concurrency)
  if (data.version === undefined || typeof data.version !== 'number' || data.version < 1) {
    errors.version = 'Valid plan version is required for optimistic concurrency.';
  }

  // Check planDate matches the parent month
  if (!isDateInMonth(planDate, monthKey)) {
    errors.planDate = `Plan date "${planDate}" does not belong to the month of the plan "${monthKey}".`;
  }

  // Validate Day Type
  if (!data.dayType || !VALID_DAY_TYPES.includes(data.dayType)) {
    errors.dayType = `Day Type must be one of: ${VALID_DAY_TYPES.join(', ')}.`;
  }

  // Validate workLocationText
  if (data.workLocationText !== undefined && data.workLocationText !== null) {
    if (typeof data.workLocationText !== 'string') {
      errors.workLocationText = 'Work location text must be a string.';
    } else if (data.workLocationText.length > 100) {
      errors.workLocationText = 'Work location text must not exceed 100 characters.';
    }
  }

  // Validate remarks
  if (data.remarks !== undefined && data.remarks !== null) {
    if (typeof data.remarks !== 'string') {
      errors.remarks = 'Remarks must be a string.';
    } else if (data.remarks.length > 500) {
      errors.remarks = 'Remarks must not exceed 500 characters.';
    }
  }

  const isFieldDay = data.dayType === 'FIELD_WORK' || data.dayType === 'JOINT_FIELD_WORK';

  // Validate Territory for Field Work
  if (isFieldDay) {
    if (!data.territoryId || typeof data.territoryId !== 'string') {
      errors.territoryId = 'Territory assignment is required for field work days.';
    }
  } else {
    if (data.territoryId) {
      errors.territoryId = 'Territory cannot be set for non-field days.';
    }
  }

  // Validate Joint Work Manager
  if (data.dayType === 'JOINT_FIELD_WORK') {
    if (!data.jointWorkUserId || typeof data.jointWorkUserId !== 'string') {
      errors.jointWorkUserId = 'Joint work manager user ID is required for joint field work.';
    }
  } else {
    if (data.jointWorkUserId) {
      errors.jointWorkUserId = 'Joint work manager cannot be selected for non-joint work days.';
    }
  }

  // Validate Activities
  if (data.activities !== undefined) {
    if (!Array.isArray(data.activities)) {
      errors.activities = 'Activities must be an array.';
    } else if (data.activities.length > 15) {
      errors.activities = 'A maximum of 15 activities is allowed per day.';
    } else {
      const activityErrors = [];
      data.activities.forEach((act, index) => {
        const actErr = {};
        
        if (!act.activityType || !VALID_ACTIVITY_TYPES.includes(act.activityType)) {
          actErr.activityType = `Activity type must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}.`;
        }

        // Validate details based on activityType
        if (act.activityType === 'DOCTOR_VISIT') {
          if (!act.doctorId || typeof act.doctorId !== 'string') {
            actErr.doctorId = 'Doctor ID is required for DOCTOR_VISIT activities.';
          }
          if (act.institutionId) {
            actErr.institutionId = 'Institution ID must not be set for DOCTOR_VISIT activities.';
          }
          if (!isFieldDay) {
            actErr.doctorVisit = 'Doctor visits are only allowed on Field Work or Joint Field Work days.';
          }
        } else if (act.activityType === 'INSTITUTION_VISIT') {
          if (!act.institutionId || typeof act.institutionId !== 'string') {
            actErr.institutionId = 'Institution ID is required for INSTITUTION_VISIT activities.';
          }
          if (act.doctorId) {
            actErr.doctorId = 'Doctor ID must not be set for INSTITUTION_VISIT activities.';
          }
          if (!isFieldDay) {
            actErr.institutionVisit = 'Institution visits are only allowed on Field Work or Joint Field Work days.';
          }
        } else {
          // Other types must not have doctor or institution
          if (act.doctorId || act.institutionId) {
            actErr.visitDetails = 'Doctor or Institution IDs cannot be specified for general activities.';
          }
        }

        // Validate time
        if (act.plannedTime !== undefined && act.plannedTime !== null && act.plannedTime !== '') {
          if (!isValidTimeString(act.plannedTime)) {
            actErr.plannedTime = 'Planned time must be in HH:mm 24-hour format.';
          }
        }

        // Validate objective
        if (act.objective !== undefined && act.objective !== null) {
          if (typeof act.objective !== 'string') {
            actErr.objective = 'Objective must be a string.';
          } else if (act.objective.length > 200) {
            actErr.objective = 'Objective must not exceed 200 characters.';
          }
        }

        // Validate remarks
        if (act.remarks !== undefined && act.remarks !== null) {
          if (typeof act.remarks !== 'string') {
            actErr.remarks = 'Remarks must be a string.';
          } else if (act.remarks.length > 200) {
            actErr.remarks = 'Remarks must not exceed 200 characters.';
          }
        }

        if (Object.keys(actErr).length > 0) {
          actErr.index = index;
          activityErrors.push(actErr);
        }
      });

      if (activityErrors.length > 0) {
        errors.activitiesErrors = activityErrors;
      }
    }
  }

  // Enforce payload size limit for safety (15KB JSON string size for single day)
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > 15360) { // 15KB in bytes
      errors.size = 'Day plan data exceeds the maximum allowed payload size limit.';
    }
  } catch (err) {
    errors.size = 'Day plan data is not JSON serializable.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate admin override action reasons
 */
export const validateAdminOverrideReason = (reason) => {
  const errors = {};
  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    errors.reason = 'A mandatory explanation reason of at least 10 characters is required for Admin override actions.';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
