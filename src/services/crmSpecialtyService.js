import { crmSpecialtyRepository } from '../repositories/crmSpecialtyRepository.js';
import { crmAuditRepository } from '../repositories/crmAuditRepository.js';
import { validateSpecialtyInput } from '../validators/crmValidator.js';
import { CrmServiceError } from './crmOrganizationService.js';

export const crmSpecialtyService = {
  async getAll() {
    return await crmSpecialtyRepository.getAll();
  },

  async getById(id) {
    const specialty = await crmSpecialtyRepository.getById(id);
    if (!specialty) {
      throw new CrmServiceError('Specialty not found.', 404);
    }
    return specialty;
  },

  async create(data, actor) {
    const { isValid, errors } = validateSpecialtyInput(data);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    const code = data.code.toLowerCase().trim();
    const existing = await crmSpecialtyRepository.getByCode(code);
    if (existing) {
      throw new CrmServiceError(`Specialty with code "${code}" already exists.`, 409);
    }

    const payload = {
      ...data,
      activeStatus: 'ACTIVE',
      createdBy: actor.email,
      updatedBy: actor.email
    };

    const newSpec = await crmSpecialtyRepository.create(payload);

    await crmAuditRepository.log({
      entityType: 'SPECIALTY',
      entityId: newSpec.id,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Created specialty: ${newSpec.name} (${code})`
    });

    return newSpec;
  },

  async update(id, data, actor) {
    const existing = await crmSpecialtyRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Specialty not found.', 404);
    }

    const { isValid, errors } = validateSpecialtyInput({
      ...existing,
      ...data
    });
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    if (data.code && data.code.toLowerCase().trim() !== existing.code) {
      const code = data.code.toLowerCase().trim();
      const duplicate = await crmSpecialtyRepository.getByCode(code);
      if (duplicate && duplicate.id !== id) {
        throw new CrmServiceError(`Specialty with code "${code}" already exists.`, 409);
      }
    }

    const payload = {
      ...data,
      updatedBy: actor.email
    };

    const updated = await crmSpecialtyRepository.update(id, payload);

    await crmAuditRepository.log({
      entityType: 'SPECIALTY',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Updated specialty: ${updated.name} (${updated.code})`
    });

    return updated;
  },

  async updateStatus(id, activeStatus, actor) {
    const existing = await crmSpecialtyRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Specialty not found.', 404);
    }

    if (existing.activeStatus === activeStatus) {
      return;
    }

    await crmSpecialtyRepository.updateStatus(id, activeStatus, actor.email);

    await crmAuditRepository.log({
      entityType: 'SPECIALTY',
      entityId: id,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `${activeStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'} specialty: ${existing.name} (${existing.code})`
    });
  }
};
