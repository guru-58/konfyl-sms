import { crmAssignmentRepository } from '../repositories/crmAssignmentRepository.js';
import { crmOrganizationRepository } from '../repositories/crmOrganizationRepository.js';
import { crmAuditRepository } from '../repositories/crmAuditRepository.js';
import { validateReportingAssignmentInput, validateTerritoryAssignmentInput } from '../validators/crmValidator.js';
import { CrmServiceError } from './crmOrganizationService.js';
import { db } from '../config/firebaseAdmin.js';

export const crmAssignmentService = {
  /**
   * List reporting assignments
   */
  async getReportingAssignments(filters = {}) {
    return await crmAssignmentRepository.getReportingAssignments(filters);
  },

  /**
   * List territory/unit assignments
   */
  async getTerritoryAssignments(filters = {}) {
    return await crmAssignmentRepository.getTerritoryAssignments(filters);
  },

  /**
   * Retrieve history for a user
   */
  async getAssignmentHistory(employeeId) {
    return await crmAssignmentRepository.getAssignmentHistory(employeeId);
  },

  /**
   * Assign manager to employee with transition transaction
   */
  async assignReporting(data, actor) {
    const { isValid, errors } = validateReportingAssignmentInput(data);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    // 1. Verify employee exists and is active
    const empSnap = await db.collection('users').doc(data.employeeId).get();
    if (!empSnap.exists) {
      throw new CrmServiceError('Employee does not exist.', 400);
    }
    const empData = empSnap.data();
    if (empData.employmentStatus === 'INACTIVE' || empData.active === false) {
      throw new CrmServiceError('Employee is deactivated/inactive and cannot receive assignments.', 400);
    }

    // 2. Verify manager exists and is active
    let managerName = null;
    let managerEmail = null;
    if (data.managerId) {
      const mgrSnap = await db.collection('users').doc(data.managerId).get();
      if (!mgrSnap.exists) {
        throw new CrmServiceError('Reporting manager does not exist.', 400);
      }
      const mgrData = mgrSnap.data();
      if (mgrData.employmentStatus === 'INACTIVE' || mgrData.active === false) {
        throw new CrmServiceError('Reporting manager is inactive and cannot receive new reporting assignments.', 400);
      }
      if (mgrData.role !== data.managerRole) {
        throw new CrmServiceError(`Role mismatch: manager is registered as "${mgrData.role}" but payload indicates "${data.managerRole}".`, 400);
      }
      managerName = mgrData.name;
      managerEmail = mgrData.email;
    }

    if (empData.role !== data.employeeRole) {
      throw new CrmServiceError(`Role mismatch: employee is registered as "${empData.role}" but payload indicates "${data.employeeRole}".`, 400);
    }

    const payload = {
      employeeId: data.employeeId,
      employeeName: empData.name,
      employeeEmail: empData.email,
      employeeRole: data.employeeRole,
      managerId: data.managerId || null,
      managerName,
      managerEmail,
      managerRole: data.managerRole || null,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || null,
      isPrimary: data.isPrimary === undefined ? true : !!data.isPrimary
    };

    const res = await crmAssignmentRepository.saveReportingAssignment(payload, actor.email);

    await crmAuditRepository.log({
      entityType: 'REPORTING_ASSIGNMENT',
      entityId: res.id,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Assigned employee ${empData.name} (${data.employeeRole}) reporting to ${managerName || 'Admin'} (${data.managerRole || 'admin'})`
    });

    return res;
  },

  /**
   * Assign employee to unit (Zone, Region, HQ, Territory)
   */
  async assignTerritory(data, actor) {
    const { isValid, errors } = validateTerritoryAssignmentInput(data);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    // 1. Verify employee exists and is active
    const empSnap = await db.collection('users').doc(data.employeeId).get();
    if (!empSnap.exists) {
      throw new CrmServiceError('Employee does not exist.', 400);
    }
    const empData = empSnap.data();
    if (empData.employmentStatus === 'INACTIVE' || empData.active === false) {
      throw new CrmServiceError('Employee is inactive.', 400);
    }
    if (empData.role !== data.employeeRole) {
      throw new CrmServiceError('Employee role mismatch.', 400);
    }

    // 2. Verify territory/unit exists and is active
    const unit = await crmOrganizationRepository.getById(data.territoryId);
    if (!unit) {
      throw new CrmServiceError('Target organization unit does not exist.', 400);
    }
    if (!unit.active) {
      throw new CrmServiceError('Target organization unit is inactive and cannot receive assignments.', 400);
    }

    // Role vs Unit type validation:
    // ZSM -> ZONE. RSM -> REGION. MR -> HEADQUARTERS or TERRITORY.
    if (data.employeeRole === 'zsm' && unit.type !== 'ZONE') {
      throw new CrmServiceError('ZSM can only be mapped to ZONE organization units.', 400);
    }
    if (data.employeeRole === 'rsm' && unit.type !== 'REGION') {
      throw new CrmServiceError('RSM can only be mapped to REGION organization units.', 400);
    }
    if (data.employeeRole === 'mr' && unit.type !== 'TERRITORY' && unit.type !== 'HEADQUARTERS') {
      throw new CrmServiceError('MR can only be mapped to TERRITORY or HEADQUARTERS organization units.', 400);
    }

    const payload = {
      territoryId: data.territoryId,
      territoryCode: unit.code,
      territoryName: unit.name,
      employeeId: data.employeeId,
      employeeName: empData.name,
      employeeEmail: empData.email,
      employeeRole: data.employeeRole,
      assignmentType: data.assignmentType,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || null
    };

    const res = await crmAssignmentRepository.saveTerritoryAssignment(payload, actor.email);

    await crmAuditRepository.log({
      entityType: 'TERRITORY_ASSIGNMENT',
      entityId: res.id,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Mapped ${empData.name} (${data.employeeRole}) as ${data.assignmentType} to ${unit.type} unit: ${unit.name} (${unit.code})`
    });

    return res;
  },

  /**
   * Close assignments
   */
  async closeReporting(id, effectiveTo, actor) {
    await crmAssignmentRepository.closeReportingAssignment(id, effectiveTo, actor.email);
    await crmAuditRepository.log({
      entityType: 'REPORTING_ASSIGNMENT',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Manually closed reporting assignment: ${id} with effectiveTo: ${effectiveTo}`
    });
  },

  async closeTerritory(id, effectiveTo, actor) {
    await crmAssignmentRepository.closeTerritoryAssignment(id, effectiveTo, actor.email);
    await crmAuditRepository.log({
      entityType: 'TERRITORY_ASSIGNMENT',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Manually closed territory assignment: ${id} with effectiveTo: ${effectiveTo}`
    });
  }
};
