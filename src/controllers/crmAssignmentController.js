import { crmAssignmentService } from '../services/crmAssignmentService.js';
import { serializeReportingAssignment, serializeTerritoryAssignment } from '../serializers/crmSerializer.js';
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

export const getReportingAssignments = async (req, res) => {
  try {
    const { employeeId, managerId, status } = req.query;
    const list = await crmAssignmentService.getReportingAssignments({ employeeId, managerId, status });
    const serialized = list.map(a => serializeReportingAssignment(a, true));
    return res.status(200).json(serialized);
  } catch (err) {
    return handleControllerError(res, err, 'Error in getReportingAssignments');
  }
};

export const createReportingAssignment = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const assign = await crmAssignmentService.assignReporting(req.body, actor);
    return res.status(201).json({
      message: 'Reporting assignment created successfully.',
      data: serializeReportingAssignment(assign, true)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createReportingAssignment');
  }
};

export const getTerritoryAssignments = async (req, res) => {
  try {
    const { employeeId, territoryId, status } = req.query;
    const list = await crmAssignmentService.getTerritoryAssignments({ employeeId, territoryId, status });
    const serialized = list.map(a => serializeTerritoryAssignment(a, true));
    return res.status(200).json(serialized);
  } catch (err) {
    return handleControllerError(res, err, 'Error in getTerritoryAssignments');
  }
};

export const createTerritoryAssignment = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const assign = await crmAssignmentService.assignTerritory(req.body, actor);
    return res.status(201).json({
      message: 'Territory unit assignment created successfully.',
      data: serializeTerritoryAssignment(assign, true)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createTerritoryAssignment');
  }
};

export const getAssignmentHistory = async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID query parameter is required.' });
    }
    const history = await crmAssignmentService.getAssignmentHistory(employeeId);
    // Serialize appropriately based on assignment sub-types
    const serialized = history.map(item => {
      if (item.type === 'REPORTING') {
        return { type: 'REPORTING', ...serializeReportingAssignment(item, true) };
      } else {
        return { type: 'TERRITORY', ...serializeTerritoryAssignment(item, true) };
      }
    });
    return res.status(200).json(serialized);
  } catch (err) {
    return handleControllerError(res, err, 'Error in getAssignmentHistory');
  }
};

export const closeReporting = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const { effectiveTo } = req.body;
    await crmAssignmentService.closeReporting(req.params.id, effectiveTo, actor);
    return res.status(200).json({ message: 'Reporting assignment closed successfully.' });
  } catch (err) {
    return handleControllerError(res, err, `Error in closeReporting (id: ${req.params.id})`);
  }
};

export const closeTerritory = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const { effectiveTo } = req.body;
    await crmAssignmentService.closeTerritory(req.params.id, effectiveTo, actor);
    return res.status(200).json({ message: 'Territory/unit assignment closed successfully.' });
  } catch (err) {
    return handleControllerError(res, err, `Error in closeTerritory (id: ${req.params.id})`);
  }
};
