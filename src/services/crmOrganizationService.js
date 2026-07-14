import { crmOrganizationRepository } from '../repositories/crmOrganizationRepository.js';
import { crmAuditRepository } from '../repositories/crmAuditRepository.js';
import { validateOrgUnitInput } from '../validators/crmValidator.js';
import { db } from '../config/firebaseAdmin.js';

export class CrmServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const crmOrganizationService = {
  /**
   * Get all organization units
   */
  async getAll(filters = {}) {
    return await crmOrganizationRepository.getAll(filters);
  },

  /**
   * Get organization unit by ID
   */
  async getById(id) {
    const unit = await crmOrganizationRepository.getById(id);
    if (!unit) {
      throw new CrmServiceError('Organization unit not found.', 404);
    }
    return unit;
  },

  /**
   * Create an organization unit
   */
  async create(data, actor) {
    const { isValid, errors } = validateOrgUnitInput(data);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    const code = data.code.toUpperCase().trim();
    const type = data.type;

    // 1. Unique code check for this type
    const existing = await crmOrganizationRepository.getByCode(code, type);
    if (existing) {
      throw new CrmServiceError(`Organization unit with code "${code}" already exists for type "${type}".`, 409);
    }

    // 2. Validate parent unit status
    if (data.parentId) {
      const parent = await crmOrganizationRepository.getById(data.parentId);
      if (!parent) {
        throw new CrmServiceError('Parent organization unit does not exist.', 400);
      }
      if (!parent.active) {
        throw new CrmServiceError('Parent organization unit is inactive. Inactive parents are not allowed.', 400);
      }
    }

    const payload = {
      ...data,
      active: true,
      createdBy: actor.email,
      updatedBy: actor.email
    };

    const newUnit = await crmOrganizationRepository.create(payload);

    await crmAuditRepository.log({
      entityType: 'ORGANIZATION_UNIT',
      entityId: newUnit.id,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Created ${type} unit: ${newUnit.name} (${code})`
    });

    return newUnit;
  },

  /**
   * Update organization unit
   */
  async update(id, data, actor) {
    const existing = await crmOrganizationRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Organization unit not found.', 404);
    }

    const { isValid, errors } = validateOrgUnitInput({
      ...existing,
      ...data,
      type: existing.type // Type cannot be modified
    });
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    // Code modification uniqueness check
    if (data.code && data.code.toUpperCase().trim() !== existing.code) {
      const code = data.code.toUpperCase().trim();
      const duplicate = await crmOrganizationRepository.getByCode(code, existing.type);
      if (duplicate && duplicate.id !== id) {
        throw new CrmServiceError(`Organization unit with code "${code}" already exists for type "${existing.type}".`, 409);
      }
    }

    // Parent modification checks
    if (data.parentId && data.parentId !== existing.parentId) {
      if (data.parentId === id) {
        throw new CrmServiceError('A unit cannot be its own parent.', 400);
      }
      const parent = await crmOrganizationRepository.getById(data.parentId);
      if (!parent) {
        throw new CrmServiceError('Parent organization unit does not exist.', 400);
      }
      if (!parent.active) {
        throw new CrmServiceError('Parent organization unit is inactive.', 400);
      }
    }

    const payload = {
      ...data,
      updatedBy: actor.email
    };
    // Exclude immutable type field
    delete payload.type;

    const updatedUnit = await crmOrganizationRepository.update(id, payload);

    await crmAuditRepository.log({
      entityType: 'ORGANIZATION_UNIT',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Updated ${existing.type} unit: ${updatedUnit.name} (${updatedUnit.code})`
    });

    return updatedUnit;
  },

  /**
   * Toggle unit status (activate / deactivate)
   */
  async updateStatus(id, active, actor) {
    const existing = await crmOrganizationRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Organization unit not found.', 404);
    }

    if (existing.active === active) {
      return; // No change
    }

    if (active === false) {
      // 1. Check if there are active downstream child units
      const hasChildren = await crmOrganizationRepository.hasActiveChildUnits(id);
      if (hasChildren) {
        throw new CrmServiceError('Cannot deactivate unit: it has active downstream child units in the hierarchy.', 400);
      }

      // 2. Check if referenced by active assignments
      const activeAssigns = await db.collection('territoryAssignments')
        .where('territoryId', '==', id)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();
      if (!activeAssigns.empty) {
        throw new CrmServiceError('Cannot deactivate unit: it is referenced by active representative or manager assignments.', 400);
      }

      // 3. Check if referenced by active doctors (for territories)
      if (existing.type === 'TERRITORY') {
        const activeDoctors = await db.collection('doctors')
          .where('primaryTerritoryId', '==', id)
          .where('activeStatus', '==', 'ACTIVE')
          .limit(1)
          .get();
        if (!activeDoctors.empty) {
          throw new CrmServiceError('Cannot deactivate territory: active doctors are mapped to this territory.', 400);
        }

        // 4. Check if referenced by active institutions
        const activeInstitutions = await db.collection('institutions')
          .where('territoryId', '==', id)
          .where('activeStatus', '==', 'ACTIVE')
          .limit(1)
          .get();
        if (!activeInstitutions.empty) {
          throw new CrmServiceError('Cannot deactivate territory: active institutions are mapped to this territory.', 400);
        }
      }
    } else {
      // Activating: Parent must be active
      if (existing.parentId) {
        const parent = await crmOrganizationRepository.getById(existing.parentId);
        if (!parent || !parent.active) {
          throw new CrmServiceError('Cannot activate unit: parent unit is inactive.', 400);
        }
      }
    }

    await crmOrganizationRepository.updateStatus(id, active, actor.email);

    await crmAuditRepository.log({
      entityType: 'ORGANIZATION_UNIT',
      entityId: id,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `${active ? 'Activated' : 'Deactivated'} ${existing.type} unit: ${existing.name} (${existing.code})`
    });
  }
};
