import { crmDoctorRepository } from '../repositories/crmDoctorRepository.js';
import { crmOrganizationRepository } from '../repositories/crmOrganizationRepository.js';
import { crmSpecialtyRepository } from '../repositories/crmSpecialtyRepository.js';
import { crmAuditRepository } from '../repositories/crmAuditRepository.js';
import { validateDoctorInput, validatePracticeLocationInput } from '../validators/crmValidator.js';
import { CrmServiceError } from './crmOrganizationService.js';
import { db } from '../config/firebaseAdmin.js';

export const crmDoctorService = {
  async getAll(options = {}) {
    return await crmDoctorRepository.getAll(options);
  },

  async getById(id) {
    const doc = await crmDoctorRepository.getById(id);
    if (!doc) {
      throw new CrmServiceError('Doctor not found.', 404);
    }
    return doc;
  },

  async create(data, actor) {
    const { isValid, errors } = validateDoctorInput(data);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    const { firstName, lastName, doctorCode, registrationNumber, specialtyCode, primaryTerritoryId, bypassDuplicateCheck } = data;

    // Normalizations
    const normName = `${firstName.trim()} ${lastName.trim()}`.toLowerCase().replace(/\s+/g, ' ');

    // 1. Doctor Code uniqueness
    if (doctorCode) {
      const codeVal = doctorCode.toUpperCase().trim();
      const existingCode = await crmDoctorRepository.getByCode(codeVal);
      if (existingCode) {
        throw new CrmServiceError(`Doctor code "${codeVal}" is already registered.`, 409);
      }
    }

    // 2. Registration Number uniqueness
    if (registrationNumber) {
      const regVal = registrationNumber.trim();
      const existingReg = await crmDoctorRepository.getByRegistration(regVal);
      if (existingReg) {
        throw new CrmServiceError(`Doctor registration number "${regVal}" is already registered.`, 409);
      }
    }

    // 3. Specialty validation
    const spec = await crmSpecialtyRepository.getByCode(specialtyCode);
    if (!spec || spec.activeStatus !== 'ACTIVE') {
      throw new CrmServiceError('Specialty does not exist or is inactive.', 400);
    }

    // 4. Territory validation
    const unit = await crmOrganizationRepository.getById(primaryTerritoryId);
    if (!unit || !unit.active || unit.type !== 'TERRITORY') {
      throw new CrmServiceError('Primary territory unit does not exist or is inactive.', 400);
    }

    // 5. Duplicate Check Scan
    if (!bypassDuplicateCheck) {
      const criteria = {
        normalizedName: normName,
        registrationNumber: registrationNumber || null,
        mobile: data.contact?.mobile || null
      };
      const duplicates = await crmDoctorRepository.findPotentialDuplicates(criteria);
      if (duplicates.length > 0) {
        // Return 409 conflict indicating duplicates found
        throw new CrmServiceError(JSON.stringify({
          warning: 'potential_duplicates',
          duplicates: duplicates.map(d => ({
            id: d.id,
            displayName: d.displayName,
            doctorCode: d.doctorCode,
            registrationNumber: d.registrationNumber,
            mobile: d.contact?.mobile || null,
            primaryTerritoryName: d.primaryTerritoryName
          }))
        }), 409);
      }
    }

    const payload = {
      ...data,
      normalizedName: normName,
      doctorCode: doctorCode ? doctorCode.toUpperCase().trim() : null,
      registrationNumber: registrationNumber ? registrationNumber.trim() : null,
      specialtyName: spec.name,
      primaryTerritoryName: unit.name,
      activeStatus: 'ACTIVE',
      createdBy: actor.email,
      updatedBy: actor.email
    };
    // Clean flag
    delete payload.bypassDuplicateCheck;

    const newDoc = await crmDoctorRepository.create(payload);

    await crmAuditRepository.log({
      entityType: 'DOCTOR',
      entityId: newDoc.id,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Created doctor: ${newDoc.displayName} (${newDoc.doctorCode || 'no code'})`
    });

    return newDoc;
  },

  async update(id, data, actor) {
    const existing = await crmDoctorRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Doctor not found.', 404);
    }

    const merged = { ...existing, ...data };
    const { isValid, errors } = validateDoctorInput(merged);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    const { firstName, lastName, doctorCode, registrationNumber, specialtyCode, primaryTerritoryId, bypassDuplicateCheck } = data;

    const normName = `${(firstName || existing.firstName).trim()} ${(lastName || existing.lastName).trim()}`.toLowerCase().replace(/\s+/g, ' ');

    if (doctorCode && doctorCode.toUpperCase().trim() !== existing.doctorCode) {
      const codeVal = doctorCode.toUpperCase().trim();
      const duplicate = await crmDoctorRepository.getByCode(codeVal);
      if (duplicate && duplicate.id !== id) {
        throw new CrmServiceError(`Doctor code "${codeVal}" is already registered to another doctor.`, 409);
      }
    }

    if (registrationNumber && registrationNumber.trim() !== existing.registrationNumber) {
      const regVal = registrationNumber.trim();
      const duplicate = await crmDoctorRepository.getByRegistration(regVal);
      if (duplicate && duplicate.id !== id) {
        throw new CrmServiceError(`Doctor registration number "${regVal}" is already registered.`, 409);
      }
    }

    let specialtyName = existing.specialtyName;
    if (specialtyCode && specialtyCode !== existing.specialtyCode) {
      const spec = await crmSpecialtyRepository.getByCode(specialtyCode);
      if (!spec || spec.activeStatus !== 'ACTIVE') {
        throw new CrmServiceError('Specialty does not exist or is inactive.', 400);
      }
      specialtyName = spec.name;
    }

    let primaryTerritoryName = existing.primaryTerritoryName;
    if (primaryTerritoryId && primaryTerritoryId !== existing.primaryTerritoryId) {
      const unit = await crmOrganizationRepository.getById(primaryTerritoryId);
      if (!unit || !unit.active || unit.type !== 'TERRITORY') {
        throw new CrmServiceError('Primary territory unit does not exist or is inactive.', 400);
      }
      primaryTerritoryName = unit.name;
    }

    // Duplicate Check on Update
    if (!bypassDuplicateCheck) {
      const nameChanged = normName !== existing.normalizedName;
      const regChanged = registrationNumber && registrationNumber.trim() !== existing.registrationNumber;
      const mobileChanged = data.contact?.mobile && data.contact?.mobile !== existing.contact?.mobile;

      if (nameChanged || regChanged || mobileChanged) {
        const criteria = {
          normalizedName: normName,
          registrationNumber: registrationNumber || null,
          mobile: data.contact?.mobile || null
        };
        const duplicates = await crmDoctorRepository.findPotentialDuplicates(criteria);
        const externalDupes = duplicates.filter(d => d.id !== id);
        if (externalDupes.length > 0) {
          throw new CrmServiceError(JSON.stringify({
            warning: 'potential_duplicates',
            duplicates: externalDupes.map(d => ({
              id: d.id,
              displayName: d.displayName,
              doctorCode: d.doctorCode,
              registrationNumber: d.registrationNumber,
              mobile: d.contact?.mobile || null,
              primaryTerritoryName: d.primaryTerritoryName
            }))
          }), 409);
        }
      }
    }

    const payload = {
      ...data,
      normalizedName: normName,
      specialtyName,
      primaryTerritoryName,
      updatedBy: actor.email
    };
    if (payload.doctorCode) {
      payload.doctorCode = payload.doctorCode.toUpperCase().trim();
    }
    if (payload.registrationNumber) {
      payload.registrationNumber = payload.registrationNumber.trim();
    }
    delete payload.bypassDuplicateCheck;

    const updated = await crmDoctorRepository.update(id, payload);

    await crmAuditRepository.log({
      entityType: 'DOCTOR',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Updated doctor: ${updated.displayName} (${updated.doctorCode || 'no code'})`
    });

    return updated;
  },

  async updateStatus(id, activeStatus, actor) {
    const existing = await crmDoctorRepository.getById(id);
    if (!existing) {
      throw new CrmServiceError('Doctor not found.', 404);
    }

    if (existing.activeStatus === activeStatus) {
      return;
    }

    await crmDoctorRepository.updateStatus(id, activeStatus, actor.email);

    await crmAuditRepository.log({
      entityType: 'DOCTOR',
      entityId: id,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `${activeStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'} doctor: ${existing.displayName}`
    });
  },

  // ----------------------------------------------------
  // Practice Locations
  // ----------------------------------------------------

  async getPracticeLocations(doctorId) {
    return await crmDoctorRepository.getPracticeLocations(doctorId);
  },

  async createPracticeLocation(data, actor) {
    const { isValid, errors } = validatePracticeLocationInput(data);
    if (!isValid) {
      throw new CrmServiceError(JSON.stringify(errors), 400);
    }

    // 1. Verify doctor is active
    const doctor = await crmDoctorRepository.getById(data.doctorId);
    if (!doctor || doctor.activeStatus !== 'ACTIVE') {
      throw new CrmServiceError('Doctor does not exist or is inactive.', 400);
    }

    // 2. Verify institution is active
    const instSnap = await db.collection('institutions').doc(data.institutionId).get();
    if (!instSnap.exists) {
      throw new CrmServiceError('Institution does not exist.', 400);
    }
    const inst = instSnap.data();
    if (inst.activeStatus !== 'ACTIVE') {
      throw new CrmServiceError('Institution is inactive and cannot be mapped.', 400);
    }

    // 3. Verify territory is active
    const unit = await crmOrganizationRepository.getById(data.territoryId);
    if (!unit || !unit.active) {
      throw new CrmServiceError('Territory does not exist or is inactive.', 400);
    }

    // 4. Duplicate relationship check
    const existingLink = await crmDoctorRepository.getDoctorInstitutionLink(data.doctorId, data.institutionId);
    if (existingLink && existingLink.activeStatus === 'ACTIVE') {
      throw new CrmServiceError('This doctor-institution mapping is already active.', 409);
    }

    // 5. isPrimary transaction logic
    if (data.isPrimary) {
      const activeLocs = await crmDoctorRepository.getPracticeLocations(data.doctorId);
      for (const loc of activeLocs) {
        if (loc.isPrimary && loc.activeStatus === 'ACTIVE') {
          await crmDoctorRepository.updatePracticeLocation(loc.id, { isPrimary: false });
        }
      }
    }

    const payload = {
      ...data,
      doctorName: doctor.displayName,
      institutionName: inst.name,
      activeStatus: 'ACTIVE',
      createdBy: actor.email,
      updatedBy: actor.email
    };

    const res = await crmDoctorRepository.createPracticeLocation(payload);

    await crmAuditRepository.log({
      entityType: 'PRACTICE_LOCATION',
      entityId: res.id,
      action: 'CREATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Mapped Doctor ${doctor.displayName} to Institution ${inst.name}`
    });

    return res;
  },

  async updatePracticeLocation(id, data, actor) {
    const existingSnap = await db.collection('doctorPracticeLocations').doc(id).get();
    if (!existingSnap.exists) {
      throw new CrmServiceError('Practice location not found.', 404);
    }
    const existing = existingSnap.data();

    // isPrimary toggle check
    if (data.isPrimary && !existing.isPrimary) {
      const activeLocs = await crmDoctorRepository.getPracticeLocations(existing.doctorId);
      for (const loc of activeLocs) {
        if (loc.isPrimary && loc.activeStatus === 'ACTIVE' && loc.id !== id) {
          await crmDoctorRepository.updatePracticeLocation(loc.id, { isPrimary: false });
        }
      }
    }

    const payload = {
      ...data,
      updatedBy: actor.email
    };

    const res = await crmDoctorRepository.updatePracticeLocation(id, payload);

    await crmAuditRepository.log({
      entityType: 'PRACTICE_LOCATION',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `Updated practice location mapping ${id}`
    });

    return res;
  },

  async updatePracticeLocationStatus(id, activeStatus, actor) {
    const existingSnap = await db.collection('doctorPracticeLocations').doc(id).get();
    if (!existingSnap.exists) {
      throw new CrmServiceError('Practice location not found.', 404);
    }

    await crmDoctorRepository.updatePracticeLocationStatus(id, activeStatus, actor.email);

    await crmAuditRepository.log({
      entityType: 'PRACTICE_LOCATION',
      entityId: id,
      action: 'STATUS_CHANGE',
      actorUserId: actor.id,
      actorRole: actor.role,
      summary: `${activeStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'} practice location ${id}`
    });
  }
};
