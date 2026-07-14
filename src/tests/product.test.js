import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'konfyl-jwt-default-secret-key-98765';

// Mock the product repository to avoid real Firestore writes
vi.mock('../repositories/productRepository.js', () => {
  let mockProducts = [
    {
      slug: 'dydrofact-10',
      name: 'Dydrofact 10',
      composition: 'Dydrogesterone 10mg Tablets',
      primaryCategory: { code: 'women-wellness', name: "Women's Wellness" },
      categoryCodes: ['women-wellness'],
      status: 'PUBLISHED',
      shortDescription: 'Some description',
      packSize: '10x10',
      medicalInfo: {},
      faqs: [],
      image: null,
      isFeatured: true,
      featuredRank: 1,
      contentVersion: 1,
      createdAt: '2026-07-12T00:00:00Z',
      updatedAt: '2026-07-12T00:00:00Z',
      createdBy: 'seed',
      updatedBy: 'seed'
    },
    {
      slug: 'draft-product',
      name: 'Draft Product',
      composition: 'Composition',
      primaryCategory: { code: 'women-wellness', name: "Women's Wellness" },
      categoryCodes: ['women-wellness'],
      status: 'DRAFT',
      shortDescription: 'Some draft description',
      packSize: '10x10',
      medicalInfo: {},
      faqs: [],
      image: null,
      isFeatured: false,
      featuredRank: null,
      contentVersion: 1,
      createdAt: '2026-07-12T00:00:00Z',
      updatedAt: '2026-07-12T00:00:00Z',
      createdBy: 'seed',
      updatedBy: 'seed'
    }
  ];

  return {
    productRepository: {
      getAll: vi.fn().mockImplementation(async () => mockProducts),
      getBySlug: vi.fn().mockImplementation(async (slug) => {
        return mockProducts.find(p => p.slug === slug) || null;
      }),
      create: vi.fn().mockImplementation(async (slug, data) => {
        mockProducts.push({ ...data, slug });
        return data;
      }),
      update: vi.fn().mockImplementation(async (slug, data) => {
        const idx = mockProducts.findIndex(p => p.slug === slug);
        if (idx !== -1) {
          mockProducts[idx] = { ...mockProducts[idx], ...data };
          return mockProducts[idx];
        }
        return null;
      }),
      updateStatus: vi.fn().mockImplementation(async (slug, status, publishedAt, updatedAt) => {
        const idx = mockProducts.findIndex(p => p.slug === slug);
        if (idx !== -1) {
          mockProducts[idx].status = status;
          mockProducts[idx].updatedAt = updatedAt;
          if (publishedAt !== undefined) {
            mockProducts[idx].publishedAt = publishedAt;
          }
        }
      }),
      delete: vi.fn().mockImplementation(async (slug) => {
        mockProducts = mockProducts.filter(p => p.slug !== slug);
      })
    }
  };
});

describe('Product Master APIs', () => {
  const adminToken = jwt.sign({ email: 'admin@konfyl.com', role: 'admin' }, JWT_SECRET);
  const mrToken = jwt.sign({ email: 'mr@konfyl.com', role: 'mr' }, JWT_SECRET);

  it('GET /api/public/products returns only PUBLISHED products', async () => {
    const res = await request(app)
      .get('/api/public/products');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    
    // Should contain Dydrofact 10, but not Draft
    const slugs = res.body.data.map(p => p.slug);
    expect(slugs).toContain('dydrofact-10');
    expect(slugs).not.toContain('draft-product');
  });

  it('GET /api/public/products strips internal audit fields', async () => {
    const res = await request(app)
      .get('/api/public/products');

    expect(res.status).toBe(200);
    const prod = res.body.data.find(p => p.slug === 'dydrofact-10');
    expect(prod).toBeDefined();
    expect(prod.createdBy).toBeUndefined();
    expect(prod.updatedBy).toBeUndefined();
  });

  it('GET /api/public/products/:slug returns 404 for DRAFT products', async () => {
    const draftRes = await request(app)
      .get('/api/public/products/draft-product');
    expect(draftRes.status).toBe(404);
  });

  it('GET /api/public/products/:slug returns 200 and full details for a PUBLISHED product', async () => {
    const res = await request(app)
      .get('/api/public/products/dydrofact-10');
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('dydrofact-10');
    expect(res.body.data.createdBy).toBeUndefined();
  });

  it('GET /api/public/products/:slug returns 404 for non-existent products', async () => {
    const res = await request(app)
      .get('/api/public/products/non-existent-slug');
    expect(res.status).toBe(404);
  });

  it('Admin endpoints require authentication and admin role', async () => {
    // 1. Unauthenticated -> 401
    const res1 = await request(app)
      .get('/api/admin/products');
    expect(res1.status).toBe(401);

    // 2. MR role -> 403 Forbidden
    const res2 = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${mrToken}`);
    expect(res2.status).toBe(403);

    // 3. Admin role -> 200 Success
    const res3 = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res3.status).toBe(200);
  });

  it('Admin can create a draft product', async () => {
    const payload = {
      slug: 'new-product-slug',
      name: 'New Product',
      composition: 'New Composition',
      status: 'DRAFT',
      primaryCategory: { code: 'women-wellness', name: "Women's Wellness" },
      categoryCodes: ['women-wellness']
    };

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('new-product-slug');
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('POST /api/admin/products returns 409 Conflict for duplicate slugs', async () => {
    const payload = {
      slug: 'dydrofact-10', // already exists in mock
      name: 'Duplicate Product',
      composition: 'Duplicate Composition',
      status: 'DRAFT',
      primaryCategory: { code: 'women-wellness', name: "Women's Wellness" },
      categoryCodes: ['women-wellness']
    };

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('PUT /api/admin/products/:slug returns 400 when changing slug', async () => {
    const payload = {
      slug: 'changed-slug', // different from URL parameter
      name: 'Dydrofact 10 Updated',
      composition: 'Dydrogesterone 10mg Tablets',
      status: 'PUBLISHED',
      primaryCategory: { code: 'women-wellness', name: "Women's Wellness" },
      categoryCodes: ['women-wellness']
    };

    const res = await request(app)
      .put('/api/admin/products/dydrofact-10')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('immutable');
  });

  it('PUT /api/admin/products/:slug increments contentVersion if content changes', async () => {
    const payload = {
      slug: 'dydrofact-10',
      name: 'Dydrofact 10 Updated', // Changed name!
      composition: 'Dydrogesterone 10mg Tablets',
      status: 'PUBLISHED',
      primaryCategory: { code: 'women-wellness', name: "Women's Wellness" },
      categoryCodes: ['women-wellness'],
      shortDescription: 'Some description',
      medicalInfo: {},
      faqs: [],
      image: null
    };

    const res = await request(app)
      .put('/api/admin/products/dydrofact-10')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data.contentVersion).toBe(2); // Incremented from 1
  });

  it('PATCH /api/admin/products/:slug/status transitions status', async () => {
    const res = await request(app)
      .patch('/api/admin/products/dydrofact-10/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DRAFT' });

    expect(res.status).toBe(200);
  });

  it('DELETE /api/admin/products/:slug deletes a product', async () => {
    const res = await request(app)
      .delete('/api/admin/products/dydrofact-10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
