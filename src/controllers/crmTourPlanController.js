import { db } from '../config/firebaseAdmin.js';
import { crmTourPlanService } from '../services/crmTourPlanService.js';
import { crmTourPlanApprovalService } from '../services/crmTourPlanApprovalService.js';
import { crmTourPlanRepository } from '../repositories/crmTourPlanRepository.js';
import { 
  serializeTourPlan, 
  serializeTourPlanDay, 
  serializeTourPlanActivity, 
  serializeTourPlanComment, 
  serializeTourPlanRevision 
} from '../serializers/crmTourPlanSerializer.js';
import { crmTourPlanGenerationService } from '../services/crmTourPlanGenerationService.js';
import { crmTourPlanImportService } from '../services/crmTourPlanImportService.js';
import ExcelJS from 'exceljs';

const handleControllerError = (res, err, defaultMsg) => {
  if (err.statusCode) {
    let parsed = null;
    try {
      parsed = JSON.parse(err.message);
    } catch {
      // ignore
    }
    if (parsed) {
      return res.status(err.statusCode).json({ errors: parsed });
    }
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(`${defaultMsg}:`, err);
  return res.status(500).json({ error: 'An unexpected database or application error occurred.' });
};

export const createPlan = async (req, res) => {
  try {
    const plan = await crmTourPlanService.createPlan(req.body.monthKey, req.user);
    return res.status(201).json({
      message: 'Monthly Tour Plan initialized successfully.',
      data: serializeTourPlan(plan)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createPlan');
  }
};

export const saveDayPlan = async (req, res) => {
  try {
    const outcome = await crmTourPlanService.saveDayPlan(
      req.params.planId,
      req.params.planDate,
      req.body,
      req.user
    );
    return res.status(200).json({
      message: 'Day plan draft saved successfully.',
      ...outcome
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in saveDayPlan');
  }
};

export const getPlan = async (req, res) => {
  try {
    const plan = await crmTourPlanService.getPlan(req.params.planId, req.crmScope, req.user);
    if (!plan) {
      return res.status(404).json({ error: 'Tour plan not found.' });
    }
    return res.status(200).json({
      ...serializeTourPlan(plan),
      days: plan.days.map(d => ({
        ...serializeTourPlanDay(d),
        activities: d.activities.map(a => serializeTourPlanActivity(a))
      }))
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getPlan');
  }
};

export const getPlans = async (req, res) => {
  try {
    const filters = {
      mrId: req.query.mrId,
      approverId: req.query.approverId,
      status: req.query.status,
      monthKey: req.query.monthKey,
      limit: req.query.limit
    };
    const list = await crmTourPlanService.getPlans(filters, req.crmScope, req.user);
    return res.status(200).json({
      data: list.map(p => serializeTourPlan(p))
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getPlans');
  }
};

export const submitPlan = async (req, res) => {
  try {
    await crmTourPlanApprovalService.submitPlan(req.params.planId, req.user);
    return res.status(200).json({
      message: 'Tour plan submitted for approval successfully.'
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in submitPlan');
  }
};

export const requestChanges = async (req, res) => {
  try {
    const { comment, reason } = req.body;
    const isOverride = req.user.role === 'admin';
    await crmTourPlanApprovalService.requestChanges(
      req.params.planId,
      comment,
      req.user,
      isOverride,
      reason
    );
    return res.status(200).json({
      message: 'Changes requested successfully.'
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in requestChanges');
  }
};

export const approvePlan = async (req, res) => {
  try {
    const { comment, reason } = req.body;
    const isOverride = req.user.role === 'admin';
    await crmTourPlanApprovalService.approvePlan(
      req.params.planId,
      comment,
      req.user,
      isOverride,
      reason
    );
    return res.status(200).json({
      message: 'Tour plan approved successfully.'
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in approvePlan');
  }
};

export const reassignApprover = async (req, res) => {
  try {
    const { newApproverId, reason } = req.body;
    await crmTourPlanApprovalService.reassignApprover(
      req.params.planId,
      newApproverId,
      reason,
      req.user
    );
    return res.status(200).json({
      message: 'Approver reassigned successfully.'
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in reassignApprover');
  }
};

export const getComments = async (req, res) => {
  try {
    const list = await crmTourPlanRepository.getComments(req.params.planId);
    return res.status(200).json({
      data: list.map(c => serializeTourPlanComment(c))
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getComments');
  }
};

export const getRevisions = async (req, res) => {
  try {
    const list = await crmTourPlanRepository.getRevisions(req.params.planId);
    return res.status(200).json({
      data: list.map(r => serializeTourPlanRevision(r))
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getRevisions');
  }
};

export const getJointWorkUsers = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const mrId = req.user.id;
    
    // Resolve RSM manager
    const rsmAssignments = await db.collection('reportingAssignments')
      .where('employeeId', '==', mrId)
      .where('status', '==', 'ACTIVE')
      .get();
      
    const managers = [];
    const rsmIds = [];
    rsmAssignments.forEach(doc => {
      const data = doc.data();
      if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
        rsmIds.push(data.managerId);
      }
    });
    
    if (rsmIds.length > 0) {
      // Resolve RSM user details
      const rsmUsersSnap = await db.collection('users')
        .where('role', '==', 'rsm')
        .get();
      
      rsmUsersSnap.forEach(doc => {
        const u = doc.data();
        if (rsmIds.includes(doc.id) && u.employmentStatus !== 'INACTIVE') {
          managers.push({ id: doc.id, name: u.name || doc.id, role: 'rsm' });
        }
      });
      
      // Resolve ZSM manager (ZSM reports)
      const zsmAssignments = await db.collection('reportingAssignments')
        .where('employeeId', 'in', rsmIds)
        .where('status', '==', 'ACTIVE')
        .get();
        
      const zsmIds = [];
      zsmAssignments.forEach(doc => {
        const data = doc.data();
        if (data.effectiveFrom <= todayStr && (!data.effectiveTo || data.effectiveTo >= todayStr)) {
          zsmIds.push(data.managerId);
        }
      });
      
      if (zsmIds.length > 0) {
        const zsmUsersSnap = await db.collection('users')
          .where('role', '==', 'zsm')
          .get();
        zsmUsersSnap.forEach(doc => {
          const u = doc.data();
          if (zsmIds.includes(doc.id) && u.employmentStatus !== 'INACTIVE') {
            managers.push({ id: doc.id, name: u.name || doc.id, role: 'zsm' });
          }
        });
      }
    }
    
    return res.status(200).json(managers);
  } catch (err) {
    return handleControllerError(res, err, 'Error in getJointWorkUsers');
  }
};

export const generatePreview = async (req, res) => {
  try {
    const preview = await crmTourPlanGenerationService.generatePreview(req.user, req.body);
    return res.status(200).json(preview);
  } catch (err) {
    return handleControllerError(res, err, 'Error in generatePreview');
  }
};

export const applyGeneratedPreview = async (req, res) => {
  try {
    const outcome = await crmTourPlanGenerationService.applyGeneratedPreview(
      req.params.planId,
      req.body,
      req.user
    );
    return res.status(200).json(outcome);
  } catch (err) {
    return handleControllerError(res, err, 'Error in applyGeneratedPreview');
  }
};

export const saveBulkDays = async (req, res) => {
  try {
    const outcome = await crmTourPlanGenerationService.saveBulkDays(
      req.params.planId,
      req.body,
      req.user
    );
    return res.status(200).json(outcome);
  } catch (err) {
    return handleControllerError(res, err, 'Error in saveBulkDays');
  }
};

export const distributeActivities = async (req, res) => {
  try {
    const outcome = await crmTourPlanGenerationService.distributeActivities(
      req.params.planId,
      req.body,
      req.user
    );
    return res.status(200).json(outcome);
  } catch (err) {
    return handleControllerError(res, err, 'Error in distributeActivities');
  }
};

export const regenerateUnplanned = async (req, res) => {
  try {
    const outcome = await crmTourPlanGenerationService.regenerateUnplanned(
      req.params.planId,
      req.body,
      req.user
    );
    return res.status(200).json(outcome);
  } catch (err) {
    return handleControllerError(res, err, 'Error in regenerateUnplanned');
  }
};

export const downloadTemplate = async (req, res) => {
  try {
    const { monthKey } = req.query;
    if (!monthKey) {
      return res.status(400).json({ error: 'monthKey query parameter is required.' });
    }
    const buffer = await crmTourPlanImportService.generateTemplate(req.user, monthKey);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Tour_Plan_Template_${monthKey}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    return handleControllerError(res, err, 'Error in downloadTemplate');
  }
};

export const importPreview = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file (.xlsx) is required for upload.' });
    }
    const preview = await crmTourPlanImportService.parseAndValidateUpload(req.user, req.file.buffer);
    return res.status(200).json(preview);
  } catch (err) {
    return handleControllerError(res, err, 'Error in importPreview');
  }
};

export const importConfirm = async (req, res) => {
  try {
    const outcome = await crmTourPlanImportService.confirmImport(
      req.params.planId,
      req.body.previewToken,
      req.body.mode || 'MERGE',
      req.user
    );
    return res.status(200).json(outcome);
  } catch (err) {
    return handleControllerError(res, err, 'Error in importConfirm');
  }
};

export const importErrors = async (req, res) => {
  try {
    const { previewToken } = req.params;
    const cacheDoc = await db.collection('tourPlanImportPreviews').doc(previewToken).get();
    if (!cacheDoc.exists) {
      return res.status(404).json({ error: 'Errors cache has expired or is invalid.' });
    }

    const cache = cacheDoc.data();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Import Errors');
    sheet.columns = [
      { header: 'Row Number', key: 'rowNumber', width: 15 },
      { header: 'Column Name', key: 'columnName', width: 20 },
      { header: 'Error Code', key: 'errorCode', width: 20 },
      { header: 'Message', key: 'message', width: 50 }
    ];

    cache.errors.forEach(err => {
      sheet.addRow({
        rowNumber: err.rowNumber,
        columnName: err.columnName,
        errorCode: err.errorCode,
        message: err.message
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Import_Errors_${previewToken}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    return handleControllerError(res, err, 'Error in importErrors');
  }
};
