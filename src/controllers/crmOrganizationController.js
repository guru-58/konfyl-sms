import { crmOrganizationService, CrmServiceError } from '../services/crmOrganizationService.js';
import { serializeOrgUnit } from '../serializers/crmSerializer.js';
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

export const getOrgUnits = async (req, res) => {
  try {
    const { type, active, parentId } = req.query;
    const units = await crmOrganizationService.getAll({ type, active, parentId });
    const serialized = units.map(u => serializeOrgUnit(u, true));
    return res.status(200).json(serialized);
  } catch (err) {
    return handleControllerError(res, err, 'Error in getOrgUnits');
  }
};

export const getOrgUnitById = async (req, res) => {
  try {
    const unit = await crmOrganizationService.getById(req.params.id);
    return res.status(200).json(serializeOrgUnit(unit, true));
  } catch (err) {
    return handleControllerError(res, err, `Error in getOrgUnitById (id: ${req.params.id})`);
  }
};

export const createOrgUnit = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const unit = await crmOrganizationService.create(req.body, actor);
    return res.status(201).json({
      message: 'Organization unit created successfully.',
      data: serializeOrgUnit(unit, true)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createOrgUnit');
  }
};

export const updateOrgUnit = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const unit = await crmOrganizationService.update(req.params.id, req.body, actor);
    return res.status(200).json({
      message: 'Organization unit updated successfully.',
      data: serializeOrgUnit(unit, true)
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateOrgUnit (id: ${req.params.id})`);
  }
};

export const updateOrgUnitStatus = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const { active } = req.body;
    if (active === undefined) {
      return res.status(400).json({ error: 'Active field is required.' });
    }
    const activeBool = active === true || active === 'true';
    await crmOrganizationService.updateStatus(req.params.id, activeBool, actor);
    return res.status(200).json({
      message: `Organization unit status updated to ${activeBool ? 'ACTIVE' : 'INACTIVE'} successfully.`
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateOrgUnitStatus (id: ${req.params.id})`);
  }
};
