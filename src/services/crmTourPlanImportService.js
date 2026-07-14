import { db } from '../config/firebaseAdmin.js';
import ExcelJS from 'exceljs';
import { crmOrganizationRepository } from '../repositories/crmOrganizationRepository.js';
import { crmDoctorRepository } from '../repositories/crmDoctorRepository.js';
import { crmInstitutionRepository } from '../repositories/crmInstitutionRepository.js';
import { crmTourPlanRepository } from '../repositories/crmTourPlanRepository.js';
import { crmTourPlanService } from './crmTourPlanService.js';
import { CrmServiceError } from './crmOrganizationService.js';
import { isValidDateString, isValidTimeString } from '../utils/timezone.js';

export const crmTourPlanImportService = {
  /**
   * Generates a dynamic Excel Template (.xlsx) for the MR and month
   */
  async generateTemplate(actor, monthKey) {
    const mrId = actor.id;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Konfyl CRM System';
    workbook.lastModifiedBy = 'Konfyl CRM System';
    
    // Resolve user detail for metadata
    const userDoc = await db.collection('users').doc(mrId).get();
    if (!userDoc.exists) throw new CrmServiceError('User not found.', 404);
    const user = userDoc.data();
    const employeeCode = user.employeeCode || 'MR_USER';

    // Resolve assigned territories
    const todayStr = new Date().toISOString().split('T')[0];
    const terrAssignsSnap = await db.collection('territoryAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();
      
    const assignedTerritoryIds = [];
    terrAssignsSnap.forEach(doc => {
      const data = doc.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        assignedTerritoryIds.push(data.territoryId);
      }
    });

    const activeTerritories = [];
    if (assignedTerritoryIds.length > 0) {
      // Chunk query or load active ones
      const unitsSnap = await db.collection('organizationUnits').get();
      unitsSnap.forEach(doc => {
        const u = doc.data();
        if (assignedTerritoryIds.includes(doc.id) && u.activeStatus !== 'INACTIVE') {
          activeTerritories.push({ id: doc.id, code: u.code || doc.id, name: u.name });
        }
      });
    }

    // Resolve active authorized doctors
    const doctorsList = [];
    if (assignedTerritoryIds.length > 0) {
      const docsSnap = await db.collection('doctors')
        .where('activeStatus', '==', 'ACTIVE')
        .where('primaryTerritoryId', 'in', assignedTerritoryIds.slice(0, 30))
        .get();
      docsSnap.forEach(doc => {
        const d = doc.data();
        doctorsList.push({
          id: doc.id,
          code: d.doctorCode || doc.id,
          name: d.displayName,
          specialty: d.specialtyCode || 'GENERAL',
          territoryCode: activeTerritories.find(t => t.id === d.primaryTerritoryId)?.code || d.primaryTerritoryId,
          preferredDays: d.preferredVisitDays?.join(', ') || 'ANY',
          frequency: d.visitFrequency || 1
        });
      });
    }

    // Resolve active institutions in territories
    const instList = [];
    if (assignedTerritoryIds.length > 0) {
      const instSnap = await db.collection('institutions')
        .where('activeStatus', '==', 'ACTIVE')
        .where('territoryId', 'in', assignedTerritoryIds.slice(0, 30))
        .get();
      instSnap.forEach(doc => {
        const i = doc.data();
        instList.push({
          code: i.institutionCode || doc.id,
          name: i.name,
          territoryCode: activeTerritories.find(t => t.id === i.territoryId)?.code || i.territoryId
        });
      });
    }

    // Resolve managers for joint-working
    const managersList = [];
    const rsmAssignSnap = await db.collection('reportingAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();
    const mgrIds = [];
    rsmAssignSnap.forEach(doc => {
      const data = doc.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        mgrIds.push(data.managerId);
      }
    });

    if (mgrIds.length > 0) {
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach(doc => {
        const u = doc.data();
        if (mgrIds.includes(doc.id) && u.employmentStatus !== 'INACTIVE') {
          managersList.push({
            employeeCode: u.employeeCode || doc.id,
            name: u.name,
            role: u.role.toUpperCase()
          });
        }
      });
    }

    // 1. Instructions Sheet
    const instSheet = workbook.addWorksheet('Instructions');
    instSheet.columns = [
      { header: 'Instruction Guidance', key: 'text', width: 80 }
    ];
    instSheet.addRow(['MONTHLY TOUR PLAN EXCEL TEMPLATE INSTRUCTIONS']);
    instSheet.addRow(['1. Do not rename sheet tab names or change columns layout.']);
    instSheet.addRow(['2. Complete the Tour Plan sheet date by date for the month: ' + monthKey]);
    instSheet.addRow(['3. Acceptable Day Types: FIELD_WORK, JOINT_FIELD_WORK, MEETING, TRAINING, ADMIN_WORK, WEEK_OFF, HOLIDAY, LEAVE']);
    instSheet.addRow(['4. Acceptable Activity Types: DOCTOR_VISIT, INSTITUTION_VISIT, FIELD_ACTIVITY, MEETING, OTHER']);
    instSheet.addRow(['5. Date Format must be: YYYY-MM-DD (e.g., ' + monthKey + '-01)']);
    instSheet.addRow(['6. Planned Time Format: HH:mm (24-hour style, e.g., 09:30, 14:00)']);
    instSheet.addRow(['7. Ensure the codes for Territories, Doctors, and Institutions match the codes listed in the references tabs.']);
    instSheet.addRow(['8. Metadata validation coordinates must not be modified or cleared.']);
    instSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 2. Reference Sheets (to populate dropdowns / references)
    const terrSheet = workbook.addWorksheet('Territories');
    terrSheet.columns = [
      { header: 'Territory Code', key: 'code', width: 20 },
      { header: 'Territory Name', key: 'name', width: 35 }
    ];
    activeTerritories.forEach(t => terrSheet.addRow(t));
    terrSheet.protect('secret-pass', { selectLockedCells: true, selectUnlockedCells: false });

    const docSheet = workbook.addWorksheet('Doctors');
    docSheet.columns = [
      { header: 'Doctor Code', key: 'code', width: 15 },
      { header: 'Doctor Name', key: 'name', width: 30 },
      { header: 'Specialty', key: 'specialty', width: 15 },
      { header: 'Territory Code', key: 'territoryCode', width: 20 },
      { header: 'Preferred Days', key: 'preferredDays', width: 15 },
      { header: 'Visit Frequency', key: 'frequency', width: 15 }
    ];
    doctorsList.forEach(d => docSheet.addRow(d));
    docSheet.protect('secret-pass');

    const instsSheet = workbook.addWorksheet('Institutions');
    instsSheet.columns = [
      { header: 'Institution Code', key: 'code', width: 20 },
      { header: 'Institution Name', key: 'name', width: 30 },
      { header: 'Territory Code', key: 'territoryCode', width: 20 }
    ];
    instList.forEach(i => instsSheet.addRow(i));
    instsSheet.protect('secret-pass');

    const jwSheet = workbook.addWorksheet('Joint Work Users');
    jwSheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 20 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Role', key: 'role', width: 15 }
    ];
    managersList.forEach(m => jwSheet.addRow(m));
    jwSheet.protect('secret-pass');

    const dtSheet = workbook.addWorksheet('Day Types');
    ['FIELD_WORK', 'JOINT_FIELD_WORK', 'MEETING', 'TRAINING', 'ADMIN_WORK', 'WEEK_OFF', 'HOLIDAY', 'LEAVE'].forEach(t => dtSheet.addRow([t]));
    dtSheet.protect('secret-pass');

    const atSheet = workbook.addWorksheet('Activity Types');
    ['DOCTOR_VISIT', 'INSTITUTION_VISIT', 'FIELD_ACTIVITY', 'MEETING', 'OTHER'].forEach(t => atSheet.addRow([t]));
    atSheet.protect('secret-pass');

    // 3. Metadata Sheet (Hidden)
    const metaSheet = workbook.addWorksheet('Template Metadata');
    metaSheet.columns = [
      { header: 'Key', key: 'key', width: 20 },
      { header: 'Value', key: 'val', width: 40 }
    ];
    metaSheet.addRow(['Template Version', '1.0']);
    metaSheet.addRow(['Template ID', 'TP_TEMP_' + Math.random().toString(36).substring(2, 10).toUpperCase()]);
    metaSheet.addRow(['Generated For User ID', mrId]);
    metaSheet.addRow(['Employee Code', employeeCode]);
    metaSheet.addRow(['Plan Month', monthKey]);
    metaSheet.addRow(['Generated At', new Date().toISOString()]);
    metaSheet.addRow(['Application Timezone', process.env.APP_TIMEZONE || 'Asia/Kolkata']);
    metaSheet.state = 'hidden';
    metaSheet.protect('secret-pass');

    // 4. Main Tour Plan Sheet
    const tpSheet = workbook.addWorksheet('Tour Plan');
    tpSheet.columns = [
      { header: 'Plan Date', key: 'planDate', width: 15 },
      { header: 'Day Type', key: 'dayType', width: 20 },
      { header: 'Territory Code', key: 'territoryCode', width: 20 },
      { header: 'Activity Type', key: 'activityType', width: 20 },
      { header: 'Doctor Code', key: 'doctorCode', width: 15 },
      { header: 'Institution Code', key: 'institutionCode', width: 20 },
      { header: 'Practice Location Code', key: 'practiceLocationCode', width: 25 },
      { header: 'Planned Time', key: 'plannedTime', width: 15 },
      { header: 'Joint Work Employee Code', key: 'jointWorkEmployeeCode', width: 25 },
      { header: 'Objective', key: 'objective', width: 30 },
      { header: 'Remarks', key: 'remarks', width: 30 }
    ];

    // Style headers
    tpSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tpSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C6694' } }; // Blue background
    tpSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Inject data validations
    for (let r = 2; r <= 150; r++) {
      tpSheet.getCell(`B${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ["'Day Types'!$A$1:$A$8"]
      };
      tpSheet.getCell(`D${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ["'Activity Types'!$A$1:$A$5"]
      };
    }

    // Return XLSX buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  },

  /**
   * Safe check for Formula Injection attacks
   */
  sanitizeString(val) {
    if (typeof val !== 'string') return val;
    const clean = val.trim();
    if (clean.startsWith('=') || clean.startsWith('+') || clean.startsWith('-') || clean.startsWith('@')) {
      return `'${clean}`; // Escape with single quote
    }
    return clean;
  },

  /**
   * Parse uploaded excel stream/buffer, run validations, and write preview state to temporary collection
   */
  async parseAndValidateUpload(actor, fileBuffer) {
    const mrId = actor.id;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    // 1. Verify required worksheets are present
    const tpSheet = workbook.getWorksheet('Tour Plan');
    const metaSheet = workbook.getWorksheet('Template Metadata');

    if (!tpSheet || !metaSheet) {
      throw new CrmServiceError('Invalid workbook format. "Tour Plan" and "Template Metadata" sheets must be present.', 400);
    }

    // 2. Parse metadata & validate
    const metadata = {};
    metaSheet.eachRow((row) => {
      const key = row.getCell(1).value;
      const val = row.getCell(2).value;
      if (key && val) {
        metadata[key.toString().trim()] = val.toString().trim();
      }
    });

    if (metadata['Generated For User ID'] !== mrId) {
      throw new CrmServiceError('Security Error: Uploaded template was generated for a different representative.', 403);
    }

    const monthKey = metadata['Plan Month'];
    if (!monthKey) {
      throw new CrmServiceError('Template Metadata is missing Plan Month.', 400);
    }

    // 3. Resolve dynamic reference mappings for verification
    const activeTerritories = [];
    const activeDoctors = [];
    const activeInstitutions = [];
    const activeManagers = [];

    // Territories
    const terrSnap = await db.collection('territoryAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();
    const assignedIds = [];
    terrSnap.forEach(d => assignedIds.push(d.data().territoryId));

    if (assignedIds.length > 0) {
      const unitsSnap = await db.collection('organizationUnits').get();
      unitsSnap.forEach(doc => {
        const u = doc.data();
        if (assignedIds.includes(doc.id) && u.activeStatus !== 'INACTIVE') {
          activeTerritories.push({ id: doc.id, code: (u.code || doc.id).toUpperCase(), name: u.name });
        }
      });
    }

    // Doctors
    if (assignedIds.length > 0) {
      const docSnap = await db.collection('doctors')
        .where('activeStatus', '==', 'ACTIVE')
        .where('primaryTerritoryId', 'in', assignedIds.slice(0, 30))
        .get();
      docSnap.forEach(doc => {
        const d = doc.data();
        activeDoctors.push({ id: doc.id, code: (d.doctorCode || doc.id).toUpperCase(), name: d.displayName, territoryId: d.primaryTerritoryId });
      });
    }

    // Institutions
    if (assignedIds.length > 0) {
      const instSnap = await db.collection('institutions')
        .where('activeStatus', '==', 'ACTIVE')
        .where('territoryId', 'in', assignedIds.slice(0, 30))
        .get();
      instSnap.forEach(doc => {
        const i = doc.data();
        activeInstitutions.push({ id: doc.id, code: (i.institutionCode || doc.id).toUpperCase(), name: i.name, territoryId: i.territoryId });
      });
    }

    // Managers
    const mgrAssignSnap = await db.collection('reportingAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();
    const mgrIds = [];
    mgrAssignSnap.forEach(d => mgrIds.push(d.data().managerId));
    if (mgrIds.length > 0) {
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach(doc => {
        const u = doc.data();
        if (mgrIds.includes(doc.id) && u.employmentStatus !== 'INACTIVE') {
          activeManagers.push({ id: doc.id, code: (u.employeeCode || doc.id).toUpperCase(), name: u.name });
        }
      });
    }

    const errors = [];
    const warnings = [];
    const validRows = [];
    
    let totalRows = 0;
    let warningRowsCount = 0;
    let invalidRowsCount = 0;

    const parsedDaysMap = {}; // planDate -> dayType payload
    const parsedActsList = []; // list of activities parsed

    // 4. Parse row data
    tpSheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // Skip headers
      
      const rawDate = row.getCell(1).value;
      const rawDayType = row.getCell(2).value;
      const rawTerrCode = row.getCell(3).value;
      const rawActType = row.getCell(4).value;
      const rawDocCode = row.getCell(5).value;
      const rawInstCode = row.getCell(6).value;
      const rawPLCode = row.getCell(7).value;
      const rawTime = row.getCell(8).value;
      const rawJwCode = row.getCell(9).value;
      const rawObjective = row.getCell(10).value;
      const rawRemarks = row.getCell(11).value;

      if (!rawDate && !rawDayType) return; // Ignore blank/empty rows

      totalRows++;
      let rowHasError = false;
      let rowHasWarning = false;

      // Extract values & sanitize
      const dateVal = rawDate ? rawDate.toString().trim() : null;
      const dayTypeVal = rawDayType ? rawDayType.toString().trim().toUpperCase() : null;
      const terrCodeVal = rawTerrCode ? rawTerrCode.toString().trim().toUpperCase() : null;
      const actTypeVal = rawActType ? rawActType.toString().trim().toUpperCase() : null;
      const docCodeVal = rawDocCode ? rawDocCode.toString().trim().toUpperCase() : null;
      const instCodeVal = rawInstCode ? rawInstCode.toString().trim().toUpperCase() : null;
      const plCodeVal = rawPLCode ? rawPLCode.toString().trim() : null;
      const timeVal = rawTime ? rawTime.toString().trim() : null;
      const jwCodeVal = rawJwCode ? rawJwCode.toString().trim().toUpperCase() : null;
      const objectiveVal = this.sanitizeString(rawObjective);
      const remarksVal = this.sanitizeString(rawRemarks);

      // Validate Date
      if (!dateVal || !isValidDateString(dateVal)) {
        errors.push({ rowNumber: rowNum, columnName: 'Plan Date', errorCode: 'INVALID_DATE', message: 'Date is missing or must be YYYY-MM-DD format.' });
        rowHasError = true;
      } else if (!dateVal.startsWith(monthKey)) {
        errors.push({ rowNumber: rowNum, columnName: 'Plan Date', errorCode: 'DATE_OUT_OF_RANGE', message: `Date must be within the plan month ${monthKey}.` });
        rowHasError = true;
      }

      // Validate Day Type
      const validDayTypes = ['FIELD_WORK', 'JOINT_FIELD_WORK', 'MEETING', 'TRAINING', 'ADMIN_WORK', 'WEEK_OFF', 'HOLIDAY', 'LEAVE'];
      if (!dayTypeVal || !validDayTypes.includes(dayTypeVal)) {
        errors.push({ rowNumber: rowNum, columnName: 'Day Type', errorCode: 'INVALID_DAY_TYPE', message: `Day Type must be one of: ${validDayTypes.join(', ')}.` });
        rowHasError = true;
      }

      // Validate Territory
      let matchedTerritory = null;
      if (['FIELD_WORK', 'JOINT_FIELD_WORK'].includes(dayTypeVal)) {
        if (!terrCodeVal) {
          errors.push({ rowNumber: rowNum, columnName: 'Territory Code', errorCode: 'MISSING_TERRITORY', message: 'Territory Code is required for field work days.' });
          rowHasError = true;
        } else {
          matchedTerritory = activeTerritories.find(t => t.code === terrCodeVal);
          if (!matchedTerritory) {
            errors.push({ rowNumber: rowNum, columnName: 'Territory Code', errorCode: 'UNAUTHORIZED_TERRITORY', message: 'Territory Code is unauthorized or inactive.' });
            rowHasError = true;
          }
        }
      } else if (terrCodeVal) {
        warnings.push({ rowNumber: rowNum, columnName: 'Territory Code', errorCode: 'TERRITORY_NOT_APPLICABLE', message: 'Territory code is ignored on non-field work days.' });
        rowHasWarning = true;
      }

      // Validate Joint Working
      let matchedManager = null;
      if (dayTypeVal === 'JOINT_FIELD_WORK') {
        if (!jwCodeVal) {
          errors.push({ rowNumber: rowNum, columnName: 'Joint Work Employee Code', errorCode: 'MISSING_MANAGER', message: 'Manager employee code is required on Joint Field Work days.' });
          rowHasError = true;
        } else {
          matchedManager = activeManagers.find(m => m.code === jwCodeVal);
          if (!matchedManager) {
            errors.push({ rowNumber: rowNum, columnName: 'Joint Work Employee Code', errorCode: 'UNAUTHORIZED_MANAGER', message: 'Manager employee code must report directly to the representative.' });
            rowHasError = true;
          }
        }
      }

      // Validate Activities if specified
      let matchedDoctor = null;
      let matchedInstitution = null;

      if (actTypeVal) {
        const validActTypes = ['DOCTOR_VISIT', 'INSTITUTION_VISIT', 'FIELD_ACTIVITY', 'MEETING', 'OTHER'];
        if (!validActTypes.includes(actTypeVal)) {
          errors.push({ rowNumber: rowNum, columnName: 'Activity Type', errorCode: 'INVALID_ACTIVITY_TYPE', message: `Activity Type must be one of: ${validActTypes.join(', ')}.` });
          rowHasError = true;
        }

        if (actTypeVal === 'DOCTOR_VISIT') {
          if (!docCodeVal) {
            errors.push({ rowNumber: rowNum, columnName: 'Doctor Code', errorCode: 'MISSING_DOCTOR', message: 'Doctor Code is required for DOCTOR_VISIT activity.' });
            rowHasError = true;
          } else {
            matchedDoctor = activeDoctors.find(d => d.code === docCodeVal);
            if (!matchedDoctor) {
              errors.push({ rowNumber: rowNum, columnName: 'Doctor Code', errorCode: 'UNAUTHORIZED_DOCTOR', message: 'Doctor is unauthorized, inactive, or not in representative territories.' });
              rowHasError = true;
            } else if (matchedTerritory && matchedDoctor.territoryId !== matchedTerritory.id) {
              errors.push({ rowNumber: rowNum, columnName: 'Doctor Code', errorCode: 'TERRITORY_MISMATCH', message: 'Doctor territory does not match planned day territory.' });
              rowHasError = true;
            }
          }

          if (instCodeVal) {
            warnings.push({ rowNumber: rowNum, columnName: 'Institution Code', errorCode: 'INSTITUTION_IGNORED', message: 'Institution code ignored on Doctor Visit activity.' });
            rowHasWarning = true;
          }
        } else if (actTypeVal === 'INSTITUTION_VISIT') {
          if (!instCodeVal) {
            errors.push({ rowNumber: rowNum, columnName: 'Institution Code', errorCode: 'MISSING_INSTITUTION', message: 'Institution Code is required for INSTITUTION_VISIT activity.' });
            rowHasError = true;
          } else {
            matchedInstitution = activeInstitutions.find(i => i.code === instCodeVal);
            if (!matchedInstitution) {
              errors.push({ rowNumber: rowNum, columnName: 'Institution Code', errorCode: 'UNAUTHORIZED_INSTITUTION', message: 'Institution is unauthorized, inactive, or not in representative territories.' });
              rowHasError = true;
            } else if (matchedTerritory && matchedInstitution.territoryId !== matchedTerritory.id) {
              errors.push({ rowNumber: rowNum, columnName: 'Institution Code', errorCode: 'TERRITORY_MISMATCH', message: 'Institution territory does not match planned day territory.' });
              rowHasError = true;
            }
          }

          if (docCodeVal) {
            warnings.push({ rowNumber: rowNum, columnName: 'Doctor Code', errorCode: 'DOCTOR_IGNORED', message: 'Doctor code ignored on Institution Visit activity.' });
            rowHasWarning = true;
          }
        }

        // Validate planned time
        if (timeVal && !isValidTimeString(timeVal)) {
          errors.push({ rowNumber: rowNum, columnName: 'Planned Time', errorCode: 'INVALID_TIME_FORMAT', message: 'Time must be in HH:mm 24-hour style.' });
          rowHasError = true;
        }
      }

      if (rowHasError) {
        invalidRowsCount++;
      } else {
        if (rowHasWarning) warningRowsCount++;
        
        // Collate date day parameters
        if (dateVal && dayTypeVal) {
          parsedDaysMap[dateVal] = {
            planDate: dateVal,
            dayType: dayTypeVal,
            territoryId: matchedTerritory ? matchedTerritory.id : null,
            territoryName: matchedTerritory ? matchedTerritory.name : null,
            jointWorkUserId: matchedManager ? matchedManager.id : null,
            jointWorkUserName: matchedManager ? matchedManager.name : null,
            remarks: remarksVal
          };

          // Collate activity parameters
          if (actTypeVal) {
            parsedActsList.push({
              planDate: dateVal,
              activityType: actTypeVal,
              doctorId: matchedDoctor ? matchedDoctor.id : null,
              doctorName: matchedDoctor ? matchedDoctor.name : null,
              institutionId: matchedInstitution ? matchedInstitution.id : null,
              institutionName: matchedInstitution ? matchedInstitution.name : null,
              practiceLocationId: plCodeVal || null,
              plannedTime: timeVal,
              objective: objectiveVal,
              remarks: remarksVal,
              source: 'EXCEL_IMPORT'
            });
          }
        }
      }
    });

    // 5. Store validated rows in firestore temporary preview cache
    const previewToken = 'TP_PREV_' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    
    await db.collection('tourPlanImportPreviews').doc(previewToken).set({
      mrId,
      monthKey,
      days: Object.values(parsedDaysMap),
      activities: parsedActsList,
      errors,
      warnings,
      expiresAt: expiresAt.toISOString()
    });

    return {
      totalRows,
      validRows: totalRows - invalidRowsCount,
      warningRows: warningRowsCount,
      invalidRows: invalidRowsCount,
      errors,
      warnings,
      previewToken
    };
  },

  /**
   * Confirms the parsed workbook merge into the Draft plan
   */
  async confirmImport(planId, previewToken, mode, actor) {
    const cacheDoc = await db.collection('tourPlanImportPreviews').doc(previewToken).get();
    if (!cacheDoc.exists) {
      throw new CrmServiceError('Validation preview token has expired or is invalid. Please re-upload.', 410);
    }

    const cache = cacheDoc.data();
    if (cache.mrId !== actor.id && actor.role !== 'admin') {
      throw new CrmServiceError('Forbidden: Access denied to importing preview cache.', 403);
    }

    const plan = await crmTourPlanRepository.getPlanById(planId);
    if (!plan) {
      throw new CrmServiceError('Tour plan not found.', 404);
    }

    if (plan.status !== 'DRAFT' && plan.status !== 'CHANGES_REQUESTED') {
      throw new CrmServiceError(`Cannot edit a plan in status ${plan.status}.`, 400);
    }

    await db.runTransaction(async (transaction) => {
      const planRef = db.collection('tourPlans').doc(planId);
      
      // Perform writes of each day and its activities
      for (const day of cache.days) {
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
      const actsToInsert = cache.activities.filter(act => {
        if (mode === 'MERGE') {
          // If MERGE mode, only write activities where no identical doctor/date visit exists
          return true; // We can handle duplicates filter by date/doctor/inst in transaction or in-memory
        }
        return true;
      });

      // Filter duplicates in MERGE mode
      const filteredActs = [];
      if (mode === 'MERGE') {
        const existingActivities = await crmTourPlanRepository.getPlanActivities(planId);
        
        for (const act of actsToInsert) {
          const dayId = `${planId}_${act.planDate}`;
          const isDup = existingActivities.some(ea => 
            ea.tourPlanDayId === dayId &&
            ((act.doctorId && ea.doctorId === act.doctorId) || 
             (act.institutionId && ea.institutionId === act.institutionId))
          );
          if (!isDup) {
            filteredActs.push(act);
          }
        }
      } else {
        filteredActs.push(...actsToInsert);
      }

      for (let i = 0; i < filteredActs.length; i++) {
        const act = filteredActs[i];
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
          source: 'EXCEL_IMPORT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        transaction.set(actRef, actPayload);
      }

      // Increment version and save summary totals
      const nextVersion = plan.version + 1;
      transaction.update(planRef, {
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      });
    });

    // Recalculate totals
    await crmTourPlanService.recalculateSummary(planId);

    // Remove cache
    await db.collection('tourPlanImportPreviews').doc(previewToken).delete();

    return { success: true };
  }
};
