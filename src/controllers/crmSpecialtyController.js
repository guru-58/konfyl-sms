import { crmSpecialtyService } from '../services/crmSpecialtyService.js';
import { serializeSpecialty } from '../serializers/crmSerializer.js';
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
    return res.status(err.statusCode).json({ error: err.message });
  }
  logger.error(`${defaultMsg}:`, err);
  return res.status(500).json({ error: 'An unexpected database or application error occurred.' });
};

export const getSpecialties = async (req, res) => {
  try {
    const list = await crmSpecialtyService.getAll();
    const serialized = list.map(s => serializeSpecialty(s, true));
    return res.status(200).json(serialized);
  } catch (err) {
    return handleControllerError(res, err, 'Error in getSpecialties');
  }
};

export const createSpecialty = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const spec = await crmSpecialtyService.create(req.body, actor);
    return res.status(201).json({
      message: 'Specialty created successfully.',
      data: serializeSpecialty(spec, true)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createSpecialty');
  }
};

export const updateSpecialty = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const spec = await crmSpecialtyService.update(req.params.id, req.body, actor);
    return res.status(200).json({
      message: 'Specialty updated successfully.',
      data: serializeSpecialty(spec, true)
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateSpecialty (id: ${req.params.id})`);
  }
};

export const updateSpecialtyStatus = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const { status } = req.body; // ACTIVE or INACTIVE
    if (!status) {
      return res.status(400).json({ error: 'Status field is required.' });
    }
    await crmSpecialtyService.updateStatus(req.params.id, status, actor);
    return res.status(200).json({
      message: `Specialty status updated to ${status} successfully.`
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateSpecialtyStatus (id: ${req.params.id})`);
  }
};
