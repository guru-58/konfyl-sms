import { crmInstitutionService } from '../services/crmInstitutionService.js';
import { serializeInstitution } from '../serializers/crmSerializer.js';
import { CrmServiceError } from '../services/crmOrganizationService.js';
import logger from '../utils/logger.js';

const handleControllerError = (res, err, defaultMsg) => {
  if (err instanceof CrmServiceError) {
    if (err.statusCode === 400) {
      try {
        const parsed = JSON.parse(err.message);
        return res.status(400).json({ errors: parsed });
      } catch {
        return res.status(400).json({ error: err.message });
      }
    }
    if (err.statusCode === 409) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.warning === 'potential_duplicates') {
          return res.status(409).json(parsed);
        }
      } catch {
        // Fallthrough
      }
    }
    return res.status(err.statusCode).json({ error: err.message });
  }
  logger.error(`${defaultMsg}:`, err);
  return res.status(500).json({ error: 'An unexpected database or application error occurred.' });
};

export const getInstitutions = async (req, res) => {
  try {
    const { territoryId, activeStatus, type, search, page, limit, sortBy, sortOrder } = req.query;
    const { data, totalCount } = await crmInstitutionService.getAll({
      territoryId, activeStatus, type, search, page, limit, sortBy, sortOrder
    });
    const serialized = data.map(i => serializeInstitution(i, true));
    return res.status(200).json({
      data: serialized,
      meta: {
        totalCount,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10
      }
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getInstitutions');
  }
};

export const getInstitutionById = async (req, res) => {
  try {
    const inst = await crmInstitutionService.getById(req.params.id);
    return res.status(200).json(serializeInstitution(inst, true));
  } catch (err) {
    return handleControllerError(res, err, `Error in getInstitutionById (id: ${req.params.id})`);
  }
};

export const createInstitution = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const inst = await crmInstitutionService.create(req.body, actor);
    return res.status(201).json({
      message: 'Institution created successfully.',
      data: serializeInstitution(inst, true)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createInstitution');
  }
};

export const updateInstitution = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const inst = await crmInstitutionService.update(req.params.id, req.body, actor);
    return res.status(200).json({
      message: 'Institution updated successfully.',
      data: serializeInstitution(inst, true)
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateInstitution (id: ${req.params.id})`);
  }
};

export const updateInstitutionStatus = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status field is required.' });
    }
    await crmInstitutionService.updateStatus(req.params.id, status, actor);
    return res.status(200).json({
      message: `Institution status updated to ${status} successfully.`
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateInstitutionStatus (id: ${req.params.id})`);
  }
};
