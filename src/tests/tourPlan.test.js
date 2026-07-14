import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebaseAdmin.js';
import { crmTourPlanRepository } from '../repositories/crmTourPlanRepository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'konfyl-jwt-default-secret-key-98765';

// Mock database storage
const mockPlans = {};
const mockDays = {};
const mockActivities = {};

// Mock repositories to avoid real database calls
vi.mock('../repositories/crmTourPlanRepository.js', () => {
  return {
    crmTourPlanRepository: {
      getPlanById: vi.fn().mockImplementation(async (id) => mockPlans[id] || null),
      getPlans: vi.fn().mockImplementation(async () => ({ data: Object.values(mockPlans) })),
      getPlanDays: vi.fn().mockImplementation(async (planId) => Object.values(mockDays).filter(d => d.tourPlanId === planId)),
      getPlanActivities: vi.fn().mockImplementation(async (planId) => Object.values(mockActivities).filter(a => a.tourPlanId === planId)),
      createPlan: vi.fn().mockImplementation(async (id, data) => {
        if (mockPlans[id]) {
          const err = new Error('Tour plan already exists.');
          err.statusCode = 409;
          throw err;
        }
        mockPlans[id] = { id, ...data, status: 'DRAFT', version: data.version || 1 };
        return mockPlans[id];
      }),
      saveDayPlan: vi.fn().mockImplementation(async (planId, planDate, dayData, activities, actor) => {
        const plan = mockPlans[planId];
        if (!plan) {
          const err = new Error('Tour plan not found.');
          err.statusCode = 404;
          throw err;
        }
        if (plan.version !== dayData.version) {
          const err = new Error('Concurrency conflict: Tour plan has been modified.');
          err.statusCode = 409;
          throw err;
        }
        const dayId = `${planId}_${planDate}`;
        mockDays[dayId] = { id: dayId, tourPlanId: planId, planDate, ...dayData };
        plan.version += 1; // Increment version
        return { version: plan.version };
      }),
      updatePlanFields: vi.fn().mockImplementation(async (id, fields) => {
        if (mockPlans[id]) {
          mockPlans[id] = { ...mockPlans[id], ...fields };
        }
      })
    }
  };
});

vi.mock('../repositories/crmAuditRepository.js', () => ({
  crmAuditRepository: {
    log: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../repositories/crmOrganizationRepository.js', () => ({
  crmOrganizationRepository: {
    getById: vi.fn().mockImplementation(async (id) => {
      if (id === 'terr-active') return { id, name: 'Active Territory', active: true, type: 'TERRITORY', parentId: 'hq-1' };
      if (id === 'terr-inactive') return { id, name: 'Inactive Territory', active: false, type: 'TERRITORY', parentId: 'hq-1' };
      if (id === 'terr-parent-assigned') return { id, name: 'Parent Assigned Territory', active: true, type: 'TERRITORY', parentId: 'hq-assigned' };
      return null;
    })
  }
}));

vi.mock('../repositories/crmDoctorRepository.js', () => ({
  crmDoctorRepository: {
    getById: vi.fn().mockImplementation(async (id) => {
      if (id === 'doc-active') return { id, displayName: 'Dr. Active', activeStatus: 'ACTIVE', primaryTerritoryId: 'terr-active' };
      if (id === 'doc-inactive') return { id, displayName: 'Dr. Inactive', activeStatus: 'INACTIVE', primaryTerritoryId: 'terr-active' };
      return null;
    })
  }
}));

vi.mock('../repositories/crmInstitutionRepository.js', () => ({
  crmInstitutionRepository: {
    getById: vi.fn().mockImplementation(async (id) => {
      if (id === 'inst-active') return { id, name: 'Active Inst', activeStatus: 'ACTIVE', territoryId: 'terr-active' };
      return null;
    })
  }
}));

vi.mock('../config/firebaseAdmin.js', () => {
  const mockAssignments = [
    { id: 'asg-t-1', employeeId: 'mr-usr', territoryId: 'terr-active', status: 'ACTIVE', effectiveFrom: '2020-01-01', effectiveTo: null },
    { id: 'asg-hq-1', employeeId: 'mr-usr', territoryId: 'hq-assigned', status: 'ACTIVE', effectiveFrom: '2020-01-01', effectiveTo: null },
    { id: 'asg-r-1', employeeId: 'mr-usr', managerId: 'rsm-usr', managerRole: 'rsm', status: 'ACTIVE', effectiveFrom: '2020-01-01', effectiveTo: null }
  ];

  const mockUsers = {
    'mr-usr': { name: 'MR User', email: 'mr@konfyl.com', role: 'mr', employmentStatus: 'ACTIVE' },
    'rsm-usr': { name: 'RSM User', email: 'rsm@konfyl.com', role: 'rsm', employmentStatus: 'ACTIVE' },
    'zsm-usr': { name: 'ZSM User', email: 'zsm@konfyl.com', role: 'zsm', employmentStatus: 'ACTIVE' }
  };

  const mockQuery = (collectionName) => {
    let currentData = collectionName === 'territoryAssignments' || collectionName === 'reportingAssignments' 
      ? mockAssignments 
      : [];

    return {
      where: vi.fn().mockImplementation((field, op, val) => {
        currentData = currentData.filter(d => d[field] === val);
        return mockQuery(collectionName);
      }),
      get: async () => ({
        forEach: (cb) => currentData.forEach(d => cb({ id: d.id, data: () => d }))
      }),
      doc: vi.fn().mockImplementation((id) => ({
        id,
        get: async () => ({
          exists: !!mockUsers[id],
          data: () => mockUsers[id]
        })
      }))
    };
  };

  return {
    db: {
      collection: vi.fn().mockImplementation((name) => mockQuery(name)),
      runTransaction: vi.fn().mockImplementation(async (cb) => {
        const mockTx = {
          get: async (ref) => {
            if (ref && ref.id === 'mr-usr_2026-08') {
              const p = mockPlans[ref.id];
              return { exists: !!p, data: () => p };
            }
            return { exists: false };
          },
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn()
        };
        return cb(mockTx);
      })
    }
  };
});

describe('Phase 5 Tour Plan Backend APIs', () => {
  const adminToken = jwt.sign({ id: 'admin-usr', email: 'admin@konfyl.com', role: 'admin' }, JWT_SECRET);
  const mrToken = jwt.sign({ id: 'mr-usr', email: 'mr@konfyl.com', role: 'mr' }, JWT_SECRET);
  const rsmToken = jwt.sign({ id: 'rsm-usr', email: 'rsm@konfyl.com', role: 'rsm' }, JWT_SECRET);

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset databases
    for (const key in mockPlans) delete mockPlans[key];
    for (const key in mockDays) delete mockDays[key];
    for (const key in mockActivities) delete mockActivities[key];
  });

  it('enforces timezone presence on startup', () => {
    expect(process.env.APP_TIMEZONE).toBeDefined();
    expect(() => Intl.DateTimeFormat(undefined, { timeZone: process.env.APP_TIMEZONE })).not.toThrow();
  });

  it('blocks unauthenticated access to Tour Plans API', async () => {
    const res = await request(app).get('/api/crm/tour-plans');
    expect(res.status).toBe(401);
  });

  it('enforces exact route role checks (MR cannot view Admin override routes)', async () => {
    const res = await request(app)
      .post('/api/admin/tour-plans/mr-usr_2026-08/reassign')
      .set('Authorization', `Bearer ${mrToken}`)
      .send({ newApproverId: 'rsm-usr', reason: 'Override reason text long enough' });
    
    expect(res.status).toBe(403);
  });

  it('allows Admin to reassign approver with a valid reason', async () => {
    const planId = 'mr-usr_2026-08';
    // Setup a mock plan first
    await crmTourPlanRepository.createPlan(planId, {
      mrId: 'mr-usr',
      monthKey: '2026-08',
      version: 1
    });

    const res = await request(app)
      .post(`/api/admin/tour-plans/${planId}/reassign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newApproverId: 'rsm-usr', reason: 'Change due to structural realignment' });

    expect(res.status).toBe(200);
  });

  it('rejects Admin reassignments with short override reasons', async () => {
    const res = await request(app)
      .post('/api/admin/tour-plans/mr-usr_2026-08/reassign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newApproverId: 'rsm-usr', reason: 'short' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/reason/i);
  });

  it('blocks month planning for past months', async () => {
    const res = await request(app)
      .post('/api/crm/tour-plans')
      .set('Authorization', `Bearer ${mrToken}`)
      .send({ monthKey: '2020-01' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/past/i);
  });

  it('blocks month planning for dates exceeding current month + 2 limits', async () => {
    const res = await request(app)
      .post('/api/crm/tour-plans')
      .set('Authorization', `Bearer ${mrToken}`)
      .send({ monthKey: '2030-01' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/limited/i);
  });

  it('blocks day updates with concurrent conflicts (stale version)', async () => {
    const planId = 'mr-usr_2026-08';
    // Setup a mock plan
    await crmTourPlanRepository.createPlan(planId, {
      mrId: 'mr-usr',
      monthKey: '2026-08',
      version: 2
    });

    const res = await request(app)
      .put(`/api/crm/tour-plans/${planId}/days/2026-08-15`)
      .set('Authorization', `Bearer ${mrToken}`)
      .send({
        dayType: 'FIELD_WORK',
        territoryId: 'terr-active',
        version: 1, // stale version
        activities: []
      });

    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toMatch(/concurrency/i);
  });

  it('rejects day plans exceeding the maximum allowed activities limit of 15', async () => {
    const planId = 'mr-usr_2026-08';
    // Setup a mock plan first
    await crmTourPlanRepository.createPlan(planId, {
      mrId: 'mr-usr',
      monthKey: '2026-08',
      version: 1
    });

    const activities = Array.from({ length: 16 }, () => ({
      activityType: 'FIELD_ACTIVITY',
      objective: 'Generic objective'
    }));

    const res = await request(app)
      .put(`/api/crm/tour-plans/${planId}/days/2026-08-15`)
      .set('Authorization', `Bearer ${mrToken}`)
      .send({
        dayType: 'FIELD_WORK',
        territoryId: 'terr-active',
        version: 1,
        activities
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/maximum of 15 activities/i);
  });

  it('allows day plans when MR is assigned to the parent headquarters of the territory', async () => {
    const planId = 'mr-usr_2026-08';
    // Setup a mock plan first
    await crmTourPlanRepository.createPlan(planId, {
      mrId: 'mr-usr',
      monthKey: '2026-08',
      version: 1
    });

    const res = await request(app)
      .put(`/api/crm/tour-plans/${planId}/days/2026-08-15`)
      .set('Authorization', `Bearer ${mrToken}`)
      .send({
        dayType: 'FIELD_WORK',
        territoryId: 'terr-parent-assigned',
        version: 1,
        activities: []
      });

    expect(res.status).toBe(200);
  });
});
