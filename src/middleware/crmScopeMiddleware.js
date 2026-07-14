import { db } from '../config/firebaseAdmin.js';

/**
 * Middleware to calculate and attach the user's CRM visibility scope
 */
export const calculateCrmScope = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  const role = req.user.role;
  const userId = req.user.id;

  try {
    const scope = {
      all: false,
      zoneIds: [],
      regionIds: [],
      headquartersIds: [],
      territoryIds: [],
      teamUserIds: [userId] // always include self in team queries
    };

    if (role === 'admin') {
      scope.all = true;
      req.crmScope = scope;
      return next();
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch active unit assignments (Zone, Region, HQ, or Territory depending on role)
    const assignmentSnap = await db.collection('territoryAssignments')
      .where('employeeId', '==', userId)
      .where('status', '==', 'ACTIVE')
      .get();

    const assignedUnitIds = [];
    assignmentSnap.forEach(doc => {
      const data = doc.data();
      const effFrom = data.effectiveFrom || '';
      const effTo = data.effectiveTo || null;
      // Validate dates
      if (effFrom <= today && (effTo === null || effTo >= today)) {
        assignedUnitIds.push(data.territoryId);
      }
    });

    if (assignedUnitIds.length === 0) {
      // No active assignments -> empty scope
      req.crmScope = scope;
      return next();
    }

    // 2. Resolve Downstream Geographical Units based on role
    if (role === 'zsm') {
      scope.zoneIds = [...assignedUnitIds];
      
      // Fetch downstream Regions
      if (scope.zoneIds.length > 0) {
        const regionSnap = await db.collection('organizationUnits')
          .where('type', '==', 'REGION')
          .where('parentId', 'in', scope.zoneIds)
          .where('active', '==', true)
          .get();
        regionSnap.forEach(doc => scope.regionIds.push(doc.id));
      }

      // Fetch downstream Headquarters
      if (scope.regionIds.length > 0) {
        // Chunk "in" queries to Firestore limit of 30 if needed (usually less in practice)
        const chunk = scope.regionIds.slice(0, 30);
        const hqSnap = await db.collection('organizationUnits')
          .where('type', '==', 'HEADQUARTERS')
          .where('parentId', 'in', chunk)
          .where('active', '==', true)
          .get();
        hqSnap.forEach(doc => scope.headquartersIds.push(doc.id));
      }

      // Fetch downstream Territories
      if (scope.headquartersIds.length > 0) {
        const chunk = scope.headquartersIds.slice(0, 30);
        const terrSnap = await db.collection('organizationUnits')
          .where('type', '==', 'TERRITORY')
          .where('parentId', 'in', chunk)
          .where('active', '==', true)
          .get();
        terrSnap.forEach(doc => scope.territoryIds.push(doc.id));
      }

      // Resolve Reporting Team for ZSM (ZSM -> RSMs -> MRs)
      const rsmAssignments = await db.collection('reportingAssignments')
        .where('managerId', '==', userId)
        .where('status', '==', 'ACTIVE')
        .get();
      
      const rsmIds = [];
      rsmAssignments.forEach(doc => {
        const data = doc.data();
        if (data.effectiveFrom <= today && (data.effectiveTo === null || data.effectiveTo >= today)) {
          rsmIds.push(data.employeeId);
          scope.teamUserIds.push(data.employeeId);
        }
      });

      if (rsmIds.length > 0) {
        const chunk = rsmIds.slice(0, 30);
        const mrAssignments = await db.collection('reportingAssignments')
          .where('managerId', 'in', chunk)
          .where('status', '==', 'ACTIVE')
          .get();
        mrAssignments.forEach(doc => {
          const data = doc.data();
          if (data.effectiveFrom <= today && (data.effectiveTo === null || data.effectiveTo >= today)) {
            scope.teamUserIds.push(data.employeeId);
          }
        });
      }

    } else if (role === 'rsm') {
      scope.regionIds = [...assignedUnitIds];

      // Fetch downstream Headquarters
      if (scope.regionIds.length > 0) {
        const hqSnap = await db.collection('organizationUnits')
          .where('type', '==', 'HEADQUARTERS')
          .where('parentId', 'in', scope.regionIds)
          .where('active', '==', true)
          .get();
        hqSnap.forEach(doc => scope.headquartersIds.push(doc.id));
      }

      // Fetch downstream Territories
      if (scope.headquartersIds.length > 0) {
        const chunk = scope.headquartersIds.slice(0, 30);
        const terrSnap = await db.collection('organizationUnits')
          .where('type', '==', 'TERRITORY')
          .where('parentId', 'in', chunk)
          .where('active', '==', true)
          .get();
        terrSnap.forEach(doc => scope.territoryIds.push(doc.id));
      }

      // Resolve Reporting Team for RSM (RSM -> MRs)
      const mrAssignments = await db.collection('reportingAssignments')
        .where('managerId', '==', userId)
        .where('status', '==', 'ACTIVE')
        .get();
      mrAssignments.forEach(doc => {
        const data = doc.data();
        if (data.effectiveFrom <= today && (data.effectiveTo === null || data.effectiveTo >= today)) {
          scope.teamUserIds.push(data.employeeId);
        }
      });

    } else if (role === 'mr') {
      // MR is assigned directly to Headquarters or Territory units
      // Let's resolve the assigned units
      const unitsSnap = await db.collection('organizationUnits')
        .where('active', '==', true)
        .get();
      
      const allUnits = [];
      unitsSnap.forEach(doc => allUnits.push({ id: doc.id, ...doc.data() }));

      for (const unitId of assignedUnitIds) {
        const unit = allUnits.find(u => u.id === unitId);
        if (!unit) continue;

        if (unit.type === 'TERRITORY') {
          scope.territoryIds.push(unitId);
        } else if (unit.type === 'HEADQUARTERS') {
          scope.headquartersIds.push(unitId);
          // Add all Territories under this HQ
          const children = allUnits.filter(u => u.parentId === unitId && u.type === 'TERRITORY');
          children.forEach(c => scope.territoryIds.push(c.id));
        }
      }
    }

    req.crmScope = scope;
    next();
  } catch (err) {
    console.error('Failed to compute CRM visibility scope:', err);
    return res.status(500).json({ error: 'Failed to calculate user authorization scope.' });
  }
};
