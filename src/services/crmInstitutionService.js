import { crmInstitutionRepository } from '../repositories/crmInstitutionRepository.js';
import { crmOrganizationRepository } from '../repositories/crmOrganizationRepository.js';
import { crmAuditRepository } from '../repositories/crmAuditRepository.js';
import { validateInstitutionInput } from '../validators/crmValidator.js';
import { CrmServiceError } from './crmOrganizationService.js';
import { db } from '../config/firebaseAdmin.js';

export const crmInstitutionService = {
  async getAll(options = {}) {
    return await crmInstitutionRepository.getAll(options);
  },

  async getById(id) {
    const inst = await crmInstitutionRepository.getById(id);
    if (!inst) {
      throw new CrmServiceError('Institution not found.', 404);
    }
    return inst;
  },

  async create(data, actor) {
    const { isValid, errors } = validateInstitutionInput(data);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    const { name, institutionCode, territoryId, address, bypassDuplicateCheck } = data;

    // Normalizations
    const normName = name.trim().toLowerCase().replace(/\s+/g, ' ');

    // 1. Institution Code uniqueness
    if (institutionCode) {
      const codeVal = institutionCode.toUpperCase().trim();
      const existing = await crmInstitutionRepository.getByCode(codeVal);
      if (existing) {
        throw new CrmServiceError(`Institution code "${codeVal}" is already registered.`, 409);
      }
    }

    // 2. Territory validation
    const unit = await crmOrganizationRepository.getById(territoryId);
    if (!unit || !unit.active || unit.type !== 'TERRITORY') {
      throw new CrmServiceError('Territory unit does not exist or is inactive.', 400);
    }

    // 3. Duplicate checks
    if (!bypassDuplicateCheck) {
      const criteria = {
        normalizedName: normName,
        pincode: address.pincode
      };
      const duplicates = await crmInstitutionRepository.findPotentialDuplicates(criteria);
      if (duplicates.length > 0) {
        throw new CrmServiceError(JSON.stringify({
          warning: 'potential_duplicates',
          duplicates: duplicates.map(d => ({
            id: d.id,
            name: d.name,
            institutionCode: d.institutionCode,
            type: d.type,
            city: d.address?.city,
            pincode: d.address?.pincode,
            territoryName: d.territoryName
          }))
        }), 409);
      }
    }

    const payload = {
      ...data,
      normalizedName: normName,
      institutionCode: institutionCode ? institutionCode.toUpperCase().trim() : null,
      territoryName: unit.name,
      activeStatus: 'ACTIVE',
      createdBy: actor.email,
      updatedBy: actor.email
    };
    delete payload.bypassDuplicateCheck;

    const newInst = await crmInstitutionRepository.create(payload);

    await crmAuditRepository.log({
      entityType: 'INSTITUTION',
      entityId: newInst.id,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Created Institution: ${newInst.name} (${newInst.type})`
    });

    return newInst;
  },

  async update(id, data, actor) {
    const existing = await crmInstitutionRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Institution not found.', 404);
    }

    const merged = { ...existing, ...data };
    const { isValid, errors } = validateInstitutionInput(merged);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    const { name, institutionCode, territoryId, address, bypassDuplicateCheck } = data;

    const normName = name ? name.trim().toLowerCase().replace(/\s+/g, ' ') : existing.normalizedName;

    if (institutionCode && institutionCode.toUpperCase().trim() !== existing.institutionCode) {
      const codeVal = institutionCode.toUpperCase().trim();
      const duplicate = await crmInstitutionRepository.getByCode(codeVal);
      if (duplicate && duplicate.id !== id) {
        throw new CrmServiceError(`Institution code "${codeVal}" is already registered.`, 409);
      }
    }

    let territoryName = existing.territoryName;
    if (territoryId && territoryId !== existing.territoryId) {
      const unit = await crmOrganizationRepository.getById(territoryId);
      if (!unit || !unit.active || unit.type !== 'TERRITORY') {
        throw new CrmServiceError('Territory unit does not exist or is inactive.', 400);
      }
      territoryName = unit.name;
    }

    // Duplicate checks on update
    if (!bypassDuplicateCheck) {
      const nameChanged = name && normName !== existing.normalizedName;
      const pinChanged = address && address.pincode && address.pincode !== existing.address?.pincode;

      if (nameChanged || pinChanged) {
        const criteria = {
          normalizedName: normName,
          pincode: (address?.pincode || existing.address?.pincode)
        };
        const duplicates = await crmInstitutionRepository.findPotentialDuplicates(criteria);
        const externalDupes = duplicates.filter(d => d.id !== id);
        if (externalDupes.length > 0) {
          throw new CrmServiceError(JSON.stringify({
            warning: 'potential_duplicates',
            duplicates: externalDupes.map(d => ({
              id: d.id,
              name: d.name,
              institutionCode: d.institutionCode,
              type: d.type,
              city: d.address?.city,
              pincode: d.address?.pincode,
              territoryName: d.territoryName
            }))
          }), 409);
        }
      }
    }

    const payload = {
      ...data,
      normalizedName: normName,
      territoryName,
      updatedBy: actor.email
    };
    if (payload.institutionCode) {
      payload.institutionCode = payload.institutionCode.toUpperCase().trim();
    }
    delete payload.bypassDuplicateCheck;

    const updated = await crmInstitutionRepository.update(id, payload);

    await crmAuditRepository.log({
      entityType: 'INSTITUTION',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Updated Institution: ${updated.name}`
    });

    return updated;
  },

  async updateStatus(id, activeStatus, actor) {
    const existing = await crmInstitutionRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Institution not found.', 404);
    }

    if (existing.activeStatus === activeStatus) {
      return;
    }

    await crmInstitutionRepository.updateStatus(id, activeStatus, actor.email);

    await crmAuditRepository.log({
      entityType: 'INSTITUTION',
      entityId: id,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `${activeStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'} Institution: ${existing.name}`
    });
  }
};
