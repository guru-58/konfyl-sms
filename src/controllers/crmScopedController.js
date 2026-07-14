import { crmOrganizationRepository } from '../repositories/crmOrganizationRepository.js';
import { crmDoctorRepository } from '../repositories/crmDoctorRepository.js';
import { crmInstitutionRepository } from '../repositories/crmInstitutionRepository.js';
import { serializeDoctor, serializeInstitution, serializeOrgUnit, serializePracticeLocation } from '../serializers/crmSerializer.js';
import { db } from '../config/firebaseAdmin.js';

export const getMyOrganization = async (req, res) => {
  const scope = req.crmScope;
  try {
    const allUnits = await crmOrganizationRepository.getAll({ active: true });
    if (scope.all) {
      return res.status(200).json(allUnits.map(u => serializeOrgUnit(u, false)));
    }
    const allowedIds = new Set([
      ...scope.zoneIds,
      ...scope.regionIds,
      ...scope.headquartersIds,
      ...scope.territoryIds
    ]);
    const scoped = allUnits.filter(u => allowedIds.has(u.id));
    return res.status(200).json(scoped.map(u => serializeOrgUnit(u, false)));
  } catch (err) {
    console.error('Scoped getMyOrganization error:', err);
    return res.status(500).json({ error: 'Failed to fetch scoped organization hierarchy.' });
  }
};

export const getMyTerritories = async (req, res) => {
  const scope = req.crmScope;
  try {
    const allUnits = await crmOrganizationRepository.getAll({ type: 'TERRITORY', active: true });
    if (scope.all) {
      return res.status(200).json(allUnits.map(u => serializeOrgUnit(u, false)));
    }
    const scoped = allUnits.filter(u => scope.territoryIds.includes(u.id));
    return res.status(200).json(scoped.map(u => serializeOrgUnit(u, false)));
  } catch (err) {
    console.error('Scoped getMyTerritories error:', err);
    return res.status(500).json({ error: 'Failed to fetch scoped territories.' });
  }
};

export const getMyTeam = async (req, res) => {
  const scope = req.crmScope;
  try {
    if (scope.all) {
      const snap = await db.collection('users').get();
      const list = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (['mr', 'rsm', 'zsm'].includes(d.role)) {
          list.push({ id: doc.id, name: d.name, email: d.email, role: d.role, employmentStatus: d.employmentStatus || 'ACTIVE' });
        }
      });
      return res.status(200).json(list);
    }

    const snap = await db.collection('users').get();
    const list = [];
    snap.forEach(doc => {
      if (scope.teamUserIds.includes(doc.id)) {
        const d = doc.data();
        list.push({ id: doc.id, name: d.name, email: d.email, role: d.role, employmentStatus: d.employmentStatus || 'ACTIVE' });
      }
    });
    return res.status(200).json(list);
  } catch (err) {
    console.error('Scoped getMyTeam error:', err);
    return res.status(500).json({ error: 'Failed to retrieve team profile scopes.' });
  }
};

export const getScopedDoctors = async (req, res) => {
  const scope = req.crmScope;
  const { search, page, limit, specialtyCode, institutionId } = req.query;
  
  try {
    let results = [];
    
    if (scope.all) {
      const queryOptions = { activeStatus: 'ACTIVE', search, specialtyCode };
      const { data } = await crmDoctorRepository.getAll(queryOptions);
      results = data;
    } else {
      if (scope.territoryIds.length > 0) {
        const chunk = scope.territoryIds.slice(0, 30);
        let queryRef = db.collection('doctors')
          .where('activeStatus', '==', 'ACTIVE')
          .where('primaryTerritoryId', 'in', chunk);
        
        if (specialtyCode) {
          queryRef = queryRef.where('specialtyCode', '==', specialtyCode);
        }
        
        if (search) {
          const searchLower = search.toLowerCase().trim();
          queryRef = queryRef
            .where('normalizedName', '>=', searchLower)
            .where('normalizedName', '<=', searchLower + '\uf8ff');
        }
        
        const snap = await queryRef.get();
        snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
      }
    }

    // Filter by institution: only return doctors with an ACTIVE practice location at this institution
    if (institutionId) {
      const locSnapshot = await db.collection('doctorPracticeLocations')
        .where('institutionId', '==', institutionId)
        .where('activeStatus', '==', 'ACTIVE')
        .get();
      const mappedDoctorIds = new Set();
      locSnapshot.forEach(doc => mappedDoctorIds.add(doc.data().doctorId));
      results = results.filter(doc => mappedDoctorIds.has(doc.id));
    }

    results.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    const totalCount = results.length;

    // Apply pagination
    const pageVal = parseInt(page, 10) || 1;
    const limitVal = parseInt(limit, 10) || 10;
    const start = (pageVal - 1) * limitVal;
    const paginated = results.slice(start, start + limitVal);

    return res.status(200).json({
      data: paginated.map(d => serializeDoctor(d, false)),
      meta: {
        totalCount,
        page: pageVal,
        limit: limitVal
      }
    });
  } catch (err) {
    console.error('Scoped getScopedDoctors error:', err);
    return res.status(500).json({ error: 'Failed to retrieve scoped doctors.' });
  }
};

export const getScopedDoctorById = async (req, res) => {
  const scope = req.crmScope;
  try {
    const doc = await crmDoctorRepository.getById(req.params.id);
    if (!doc || doc.activeStatus !== 'ACTIVE') {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    if (!scope.all && !scope.territoryIds.includes(doc.primaryTerritoryId)) {
      // 404 return to hide existence of record outside scope
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    // Include practice locations
    const locs = await crmDoctorRepository.getPracticeLocations(doc.id);
    const serialized = serializeDoctor(doc, false);
    serialized.practiceLocations = locs
      .filter(l => l.activeStatus === 'ACTIVE')
      .map(l => serializePracticeLocation(l, false));

    return res.status(200).json(serialized);
  } catch (err) {
    console.error('Scoped getScopedDoctorById error:', err);
    return res.status(500).json({ error: 'Failed to retrieve doctor details.' });
  }
};

export const getScopedInstitutions = async (req, res) => {
  const scope = req.crmScope;
  const { search, page, limit, type } = req.query;

  try {
    let results = [];

    if (scope.all) {
      const queryOptions = { activeStatus: 'ACTIVE', search, type };
      const { data } = await crmInstitutionRepository.getAll(queryOptions);
      results = data;
    } else {
      if (scope.territoryIds.length > 0) {
        const chunk = scope.territoryIds.slice(0, 30);
        let queryRef = db.collection('institutions')
          .where('activeStatus', '==', 'ACTIVE')
          .where('territoryId', 'in', chunk);

        if (type) {
          queryRef = queryRef.where('type', '==', type);
        }

        if (search) {
          const searchLower = search.toLowerCase().trim();
          queryRef = queryRef
            .where('normalizedName', '>=', searchLower)
            .where('normalizedName', '<=', searchLower + '\uf8ff');
        }

        const snap = await queryRef.get();
        snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
      }
    }

    results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const totalCount = results.length;

    const pageVal = parseInt(page, 10) || 1;
    const limitVal = parseInt(limit, 10) || 10;
    const start = (pageVal - 1) * limitVal;
    const paginated = results.slice(start, start + limitVal);

    return res.status(200).json({
      data: paginated.map(i => serializeInstitution(i, false)),
      meta: {
        totalCount,
        page: pageVal,
        limit: limitVal
      }
    });
  } catch (err) {
    console.error('Scoped getScopedInstitutions error:', err);
    return res.status(500).json({ error: 'Failed to retrieve scoped institutions.' });
  }
};

export const getScopedInstitutionById = async (req, res) => {
  const scope = req.crmScope;
  try {
    const inst = await crmInstitutionRepository.getById(req.params.id);
    if (!inst || inst.activeStatus !== 'ACTIVE') {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    if (!scope.all && !scope.territoryIds.includes(inst.territoryId)) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    return res.status(200).json(serializeInstitution(inst, false));
  } catch (err) {
    console.error('Scoped getScopedInstitutionById error:', err);
    return res.status(500).json({ error: 'Failed to retrieve institution details.' });
  }
};
