import { crmDoctorService } from '../services/crmDoctorService.js';
import { serializeDoctor, serializePracticeLocation } from '../serializers/crmSerializer.js';
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

export const getDoctors = async (req, res) => {
  try {
    const { territoryId, institutionId, activeStatus, specialtyCode, search, page, limit, sortBy, sortOrder } = req.query;
    const { data, totalCount } = await crmDoctorService.getAll({
      territoryId, institutionId, activeStatus, specialtyCode, search, page, limit, sortBy, sortOrder
    });
    const serialized = data.map(d => serializeDoctor(d, true));
    return res.status(200).json({
      data: serialized,
      meta: {
        totalCount,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10
      }
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in getDoctors');
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doc = await crmDoctorService.getById(req.params.id);
    return res.status(200).json(serializeDoctor(doc, true));
  } catch (err) {
    return handleControllerError(res, err, `Error in getDoctorById (id: ${req.params.id})`);
  }
};

export const createDoctor = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const doc = await crmDoctorService.create(req.body, actor);
    return res.status(201).json({
      message: 'Doctor created successfully.',
      data: serializeDoctor(doc, true)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createDoctor');
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const doc = await crmDoctorService.update(req.params.id, req.body, actor);
    return res.status(200).json({
      message: 'Doctor updated successfully.',
      data: serializeDoctor(doc, true)
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateDoctor (id: ${req.params.id})`);
  }
};

export const updateDoctorStatus = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status field is required.' });
    }
    await crmDoctorService.updateStatus(req.params.id, status, actor);
    return res.status(200).json({
      message: `Doctor status updated to ${status} successfully.`
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updateDoctorStatus (id: ${req.params.id})`);
  }
};

// ----------------------------------------------------
// Practice Locations
// ----------------------------------------------------

export const getPracticeLocations = async (req, res) => {
  try {
    const list = await crmDoctorService.getPracticeLocations(req.params.id);
    const serialized = list.map(l => serializePracticeLocation(l, true));
    return res.status(200).json(serialized);
  } catch (err) {
    return handleControllerError(res, err, 'Error in getPracticeLocations');
  }
};

export const createPracticeLocation = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const loc = await crmDoctorService.createPracticeLocation({ ...req.body, doctorId: req.params.id }, actor);
    return res.status(201).json({
      message: 'Practice location mapped successfully.',
      data: serializePracticeLocation(loc, true)
    });
  } catch (err) {
    return handleControllerError(res, err, 'Error in createPracticeLocation');
  }
};

export const updatePracticeLocation = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const loc = await crmDoctorService.updatePracticeLocation(req.params.locationId, req.body, actor);
    return res.status(200).json({
      message: 'Practice location updated successfully.',
      data: serializePracticeLocation(loc, true)
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updatePracticeLocation (id: ${req.params.locationId})`);
  }
};

export const updatePracticeLocationStatus = async (req, res) => {
  try {
    const actor = { id: req.user.id, email: req.user.email, role: req.user.role };
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status field is required.' });
    }
    await crmDoctorService.updatePracticeLocationStatus(req.params.locationId, status, actor);
    return res.status(200).json({
      message: `Practice location status updated to ${status} successfully.`
    });
  } catch (err) {
    return handleControllerError(res, err, `Error in updatePracticeLocationStatus (id: ${req.params.locationId})`);
  }
};
