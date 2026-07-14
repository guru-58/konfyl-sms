import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebaseAdmin.js';
import { crmTourPlanRepository } from '../repositories/crmTourPlanRepository.js';
import { crmTourPlanGenerationService } from '../services/crmTourPlanGenerationService.js';
import { crmTourPlanImportService } from '../services/crmTourPlanImportService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'konfyl-jwt-default-secret-key-98765';

describe('Revised Tour Plan Generation & Import Integration Tests', () => {
  const mrToken = jwt.sign({ id: 'mr-usr', email: 'mr@konfyl.com', role: 'mr' }, JWT_SECRET);
  const rsmToken = jwt.sign({ id: 'rsm-usr', email: 'rsm@konfyl.com', role: 'rsm' }, JWT_SECRET);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sanitizes potential formula injection inputs during parsing', () => {
    const rawVal1 = '=SUM(A1:A5)';
    const rawVal2 = '@test';
    const rawVal3 = '+100';
    
    expect(crmTourPlanImportService.sanitizeString(rawVal1)).toBe(`'=SUM(A1:A5)`);
    expect(crmTourPlanImportService.sanitizeString(rawVal2)).toBe(`'@test`);
    expect(crmTourPlanImportService.sanitizeString(rawVal3)).toBe(`'+100`);
    expect(crmTourPlanImportService.sanitizeString('Normal Text')).toBe('Normal Text');
  });

  it('rejects Quick Builder apply with version mismatch (409 conflict)', async () => {
    // Setup mock repository behavior for getPlanById to trigger conflict check
    vi.spyOn(crmTourPlanRepository, 'getPlanById').mockResolvedValueOnce({
      id: 'mr-usr_2026-08',
      mrId: 'mr-usr',
      monthKey: '2026-08',
      status: 'DRAFT',
      version: 5 // current active version is 5
    });

    const res = await request(app)
      .post('/api/crm/tour-plans/mr-usr_2026-08/apply-generated-preview')
      .set('Authorization', `Bearer ${mrToken}`)
      .send({
        days: [],
        activities: [],
        mode: 'MERGE',
        version: 4 // sending outdated version 4
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('version mismatch');
  });

  it('rejects bulk days save when plan status is not draft or returned', async () => {
    vi.spyOn(crmTourPlanRepository, 'getPlanById').mockResolvedValueOnce({
      id: 'mr-usr_2026-08',
      mrId: 'mr-usr',
      monthKey: '2026-08',
      status: 'APPROVED', // already approved
      version: 1
    });

    const res = await request(app)
      .post('/api/crm/tour-plans/mr-usr_2026-08/bulk-days')
      .set('Authorization', `Bearer ${mrToken}`)
      .send({
        dates: ['2026-08-05'],
        dayType: 'FIELD_WORK',
        version: 1
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot edit');
  });

  it('blocks Excel confirm when previewToken is invalid or expired', async () => {
    const res = await request(app)
      .post('/api/crm/tour-plans/mr-usr_2026-08/import-confirm')
      .set('Authorization', `Bearer ${mrToken}`)
      .send({
        previewToken: 'EXPIRED_TOKEN_123',
        mode: 'MERGE'
      });

    expect(res.status).toBe(410);
    expect(res.body.error).toContain('expired or is invalid');
  });
});
