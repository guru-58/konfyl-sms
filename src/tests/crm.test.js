import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'konfyl-jwt-default-secret-key-98765';

// Mock repositories to avoid real database calls
vi.mock('../repositories/crmOrganizationRepository.js', () => {
  const mockUnits = [
    { id: 'zone-1', code: 'ZN-WEST', name: 'West Zone', type: 'ZONE', parentId: null, active: true },
    { id: 'region-1', code: 'RG-MUMBAI', name: 'Mumbai Region', type: 'REGION', parentId: 'zone-1', active: true },
    { id: 'hq-1', code: 'HQ-ANDHERI', name: 'Andheri HQ', type: 'HEADQUARTERS', parentId: 'region-1', active: true },
    { id: 'terr-1', code: 'TR-ANDHERI-W', name: 'Andheri West Territory', type: 'TERRITORY', parentId: 'hq-1', active: true, pincodes: ['400053'] }
  ];
  return {
    crmOrganizationRepository: {
      getAll: vi.fn().mockImplementation(async () => mockUnits),
      getById: vi.fn().mockImplementation(async (id) => mockUnits.find(u => u.id === id) || null),
      getByCode: vi.fn().mockImplementation(async (code) => mockUnits.find(u => u.code === code) || null),
      create: vi.fn().mockImplementation(async (data) => ({ id: `new-unit-${Date.now()}`, ...data, active: true })),
      update: vi.fn().mockImplementation(async (id, data) => ({ id, ...data })),
      updateStatus: vi.fn().mockImplementation(async () => {})
    }
  };
});

vi.mock('../repositories/crmAssignmentRepository.js', () => {
  return {
    crmAssignmentRepository: {
      getActiveAssignmentsByEmployee: vi.fn().mockImplementation(async () => []),
      getActiveManagerAssignment: vi.fn().mockImplementation(async () => null),
      createReportingAssignment: vi.fn().mockImplementation(async (data) => ({ id: 'asgn-r-1', ...data, status: 'ACTIVE' })),
      createTerritoryAssignment: vi.fn().mockImplementation(async (data) => ({ id: 'asgn-t-1', ...data, status: 'ACTIVE' })),
      closeReportingAssignment: vi.fn().mockImplementation(async () => {}),
      closeTerritoryAssignment: vi.fn().mockImplementation(async () => {}),
      getHistoryByEmployee: vi.fn().mockImplementation(async () => [])
    }
  };
});

vi.mock('../repositories/crmDoctorRepository.js', () => {
  const mockDoctors = [
    { id: 'doc-1', title: 'Dr.', firstName: 'Rahul', lastName: 'Kumar', displayName: 'Dr. Rahul Kumar', specialtyCode: 'cardiology', primaryTerritoryId: 'terr-1', activeStatus: 'ACTIVE' }
  ];
  return {
    crmDoctorRepository: {
      getAll: vi.fn().mockImplementation(async () => ({ data: mockDoctors, totalCount: 1 })),
      getById: vi.fn().mockImplementation(async (id) => mockDoctors.find(d => d.id === id) || null),
      create: vi.fn().mockImplementation(async (data) => ({ id: 'doc-new', ...data })),
      update: vi.fn().mockImplementation(async (id, data) => ({ id, ...data })),
      updateStatus: vi.fn().mockImplementation(async () => {}),
      getPracticeLocations: vi.fn().mockImplementation(async () => [])
    }
  };
});

vi.mock('../repositories/crmInstitutionRepository.js', () => {
  return {
    crmInstitutionRepository: {
      getAll: vi.fn().mockImplementation(async () => ({ data: [], totalCount: 0 })),
      getById: vi.fn().mockImplementation(async () => null)
    }
  };
});

vi.mock('../repositories/crmSpecialtyRepository.js', () => {
  return {
    crmSpecialtyRepository: {
      getAll: vi.fn().mockImplementation(async () => []),
      getById: vi.fn().mockImplementation(async () => null)
    }
  };
});

vi.mock('../repositories/crmAuditRepository.js', () => {
  return {
    crmAuditRepository: {
      log: vi.fn().mockImplementation(async () => {})
    }
  };
});

// Mock firestore queries in middleware/scoped routines
vi.mock('../config/firebaseAdmin.js', () => {
  const mockQuery = {
    where: () => mockQuery,
    get: async () => ({
      forEach: () => {}
    })
  };
  return {
    db: {
      collection: () => mockQuery
    }
  };
});

describe('Field-Force CRM Foundations Backend APIs', () => {
  const adminToken = jwt.sign({ id: 'admin-usr', email: 'admin@konfyl.com', role: 'admin' }, JWT_SECRET);
  const mrToken = jwt.sign({ id: 'mr-usr', email: 'mr@konfyl.com', role: 'mr' }, JWT_SECRET);

  it('GET /api/admin/crm/organization-units blocks access for non-admins', async () => {
    const res = await request(app)
      .get('/api/admin/crm/organization-units')
      .set('Authorization', `Bearer ${mrToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  it('GET /api/admin/crm/organization-units allows access for admins', async () => {
    const res = await request(app)
      .get('/api/admin/crm/organization-units')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0].code).toBe('ZN-WEST');
  });

  it('POST /api/admin/crm/organization-units enforces validations', async () => {
    const res = await request(app)
      .post('/api/admin/crm/organization-units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'ZN-MOCK',
        type: 'ZONE'
        // Missing name and other validations
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('GET /api/crm/my-organization computes scope for representatives', async () => {
    const res = await request(app)
      .get('/api/crm/my-organization')
      .set('Authorization', `Bearer ${mrToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('GET /api/crm/doctors blocks access without authentication', async () => {
    const res = await request(app)
      .get('/api/crm/doctors');

    expect(res.status).toBe(401);
  });
});
