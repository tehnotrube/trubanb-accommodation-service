import request from 'supertest';
import { DataSource } from 'typeorm';
import { Accommodation } from '../../src/accommodations/entities/accommodation.entity';
import { accommodationsFixture } from './fixtures/accommodations.fixtures';
import {
  TEST_HOST_TOKEN_HEADERS,
  TEST_OTHER_HOST_TOKEN_HEADERS,
  TEST_GUEST_TOKEN_HEADERS,
} from '../utils/auth/headers.utils';
import { app } from '../utils/setup-tests';
import { PeriodType } from '../../src/accommodations/entities/accommodation-rule.entity';

describe('Accommodations (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('BEGIN;');
    await dataSource.manager.save(Accommodation, accommodationsFixture);
  });

  afterEach(async () => {
    await dataSource.query('ROLLBACK;');
  });

  describe('GET /accommodations', () => {
    it('should return paginated list with default values', async () => {
      const res = await request(app.getHttpServer())
        .get('/accommodations')
        .expect(200);

      expect(res.body.data).toHaveLength(accommodationsFixture.length);
      expect(res.body.total).toBe(accommodationsFixture.length);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(20);
      expect(res.body.data[0]).not.toHaveProperty('photoKeys');
    });

    it('should respect custom page and pageSize', async () => {
      const res = await request(app.getHttpServer())
        .get('/accommodations?page=1&pageSize=1')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(accommodationsFixture.length);
    });

    it('should return empty data when page is out of range', async () => {
      const res = await request(app.getHttpServer())
        .get('/accommodations?page=999&pageSize=10')
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(accommodationsFixture.length);
    });
  });

  describe('GET /accommodations/:id', () => {
    it('should return accommodation by id', async () => {
      const accs = await dataSource.getRepository(Accommodation).find();
      const id = accs[0].id;

      const res = await request(app.getHttpServer())
        .get(`/accommodations/${id}`)
        .expect(200);

      expect(res.body.id).toBe(id);
      expect(res.body.name).toBe(accommodationsFixture[0].name);
      expect(res.body.location).toBe(accommodationsFixture[0].location);
      expect(res.body).toHaveProperty('photoUrls');
      expect(res.body).not.toHaveProperty('photoKeys');
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/accommodations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /accommodations', () => {
    const validPayload = {
      name: 'New Modern Loft',
      location: 'Novi Sad',
      amenities: ['wifi', 'balcony'],
      minGuests: 1,
      maxGuests: 3,
      basePrice: 95.5,
      autoApprove: true,
      isPerUnit: true,
      hostId: 'host@test.com',
    };

    it('should create accommodation', async () => {
      const res = await request(app.getHttpServer())
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(validPayload)
        .expect(201);

      expect(res.body).toMatchObject({
        name: validPayload.name,
        location: validPayload.location,
        amenities: expect.arrayContaining(validPayload.amenities),
        photoUrls: [],
        basePrice: validPayload.basePrice,
        autoApprove: validPayload.autoApprove,
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/accommodations')
        .send(validPayload)
        .expect(401);
    });

    it('should reject guest role', async () => {
      await request(app.getHttpServer())
        .post('/accommodations')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .send(validPayload)
        .expect(403);
    });

    it('should reject negative price', async () => {
      await request(app.getHttpServer())
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ ...validPayload, basePrice: -10 })
        .expect(400);
    });

    it('should reject minGuests greater than maxGuests', async () => {
      await request(app.getHttpServer())
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ ...validPayload, minGuests: 5, maxGuests: 3 })
        .expect(400);
    });
  });

  describe('PUT /accommodations/:id', () => {
    it('should update accommodation', async () => {
      const accs = await dataSource.getRepository(Accommodation).find();
      const id = accs[0].id;

      const updateData = {
        name: 'Renamed Wonderful Place',
        basePrice: 220.0,
        autoApprove: true,
      };

      const res = await request(app.getHttpServer())
        .put(`/accommodations/${id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(updateData)
        .expect(200);

      expect(res.body.name).toBe(updateData.name);
      expect(res.body.basePrice).toBe(updateData.basePrice);
      expect(res.body.autoApprove).toBe(true);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .put('/accommodations/00000000-0000-0000-0000-000000000000')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /accommodations/:id', () => {
    it('should delete accommodation', async () => {
      const accs = await dataSource.getRepository(Accommodation).find();
      const id = accs[0].id;

      await request(app.getHttpServer())
        .delete(`/accommodations/${id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(204);

      const exists = await dataSource.getRepository(Accommodation).findOneBy({ id });
      expect(exists).toBeNull();
    });
  });

  describe('POST /accommodations/:id/photos', () => {
    it('should upload single photo', async () => {
      const accs = await dataSource.getRepository(Accommodation).find();
      const id = accs[0].id;

      const res = await request(app.getHttpServer())
        .post(`/accommodations/${id}/photos`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake-image'), {
          filename: 'living-room.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(res.body.photoUrls).toHaveLength(1);
      expect(res.body.photoUrls[0]).toContain('http');
    });

    it('should upload multiple photos', async () => {
      const accs = await dataSource.getRepository(Accommodation).find();
      const id = accs[0].id;

      const res = await request(app.getHttpServer())
        .post(`/accommodations/${id}/photos`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake1'), {
          filename: 'test1.jpg',
          contentType: 'image/jpeg',
        })
        .attach('photos', Buffer.from('fake2'), {
          filename: 'test2.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(res.body.photoUrls).toHaveLength(2);
    });

    it('should reject non-image file', async () => {
      const accs = await dataSource.getRepository(Accommodation).find();
      const id = accs[0].id;

      await request(app.getHttpServer())
        .post(`/accommodations/${id}/photos`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('hello'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('should return 404 for non-existent accommodation', async () => {
      await request(app.getHttpServer())
        .post('/accommodations/00000000-0000-0000-0000-000000000000/photos')
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake'), 'test.jpg')
        .expect(404);
    });

    it('should forbid upload by different host', async () => {
      const accs = await dataSource.getRepository(Accommodation).find();
      const id = accs[0].id;

      await request(app.getHttpServer())
        .post(`/accommodations/${id}/photos`)
        .set(TEST_OTHER_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake'), 'test.jpg')
        .expect(403);
    });
  });

  describe('Rules', () => {
    let accId: string;

    beforeEach(async () => {
      // No need for separate BEGIN since parent beforeEach already does it
      const accommodation = await dataSource.getRepository(Accommodation).findOne({ where: {} });
      accId = accommodation!.id;
    });

    it('should create rule', async () => {
      const payload = {
      startDate: '2026-01-01', 
      endDate: '2026-01-10',
        overridePrice: 150,
        multiplier: 1.4,
        periodType: PeriodType.SEASONAL,
      };

      const res = await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(payload)
        .expect(201);

      expect(res.body.multiplier).toBe("1.40");
      expect(res.body.periodType).toBe(payload.periodType);
    });

    it('should reject overlapping rule', async () => {
      await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2027-01-15',
          endDate: '2027-02-15',
          multiplier: 1.3,
          periodType: PeriodType.SEASONAL
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2027-01-01',
          endDate: '2027-01-31',
          multiplier: 1.0
        })
        .expect(400);
    });

    it('should update rule', async () => {
      const create = await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-07-01',
          endDate: '2025-07-31',
          multiplier: 1.2,
        })
        .expect(201);

      const ruleId = create.body.id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/accommodations/${accId}/rules/${ruleId}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ multiplier: 1.65, overridePrice: 180 })
        .expect(200);

      expect(updateRes.body.multiplier).toBe(1.65);
      expect(updateRes.body.overridePrice).toBe(180);
    });

    it('should reject update to overlapping period', async () => {
      await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          multiplier: 1.0,
        })
        .expect(201);

      const create = await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-02-01',
          endDate: '2025-02-28',
          multiplier: 1.2,
        })
        .expect(201);

      const ruleId = create.body.id;

      await request(app.getHttpServer())
        .patch(`/accommodations/${accId}/rules/${ruleId}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-01-15',
          endDate: '2025-02-15',
        })
        .expect(400);
    });

    it('should list rules', async () => {
      const body = await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          multiplier: 1.3,
          periodType: PeriodType.SEASONAL
        })

      console.log(body)
      await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-06-01',
          endDate: '2025-08-31',
          multiplier: 1.5,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/accommodations/${accId}/rules`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should delete rule', async () => {
      const create = await request(app.getHttpServer())
        .post(`/accommodations/${accId}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-03-01',
          endDate: '2025-03-15',
          multiplier: 1.0,
        })
        .expect(201);

      const ruleId = create.body.id;

      await request(app.getHttpServer())
        .delete(`/accommodations/${accId}/rules/${ruleId}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(204);
    });

    it('should return 404 when deleting non-existent rule', async () => {
      await request(app.getHttpServer())
        .delete(`/accommodations/${accId}/rules/00000000-0000-0000-0000-000000000000`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(404);
    });
  });

  describe('Manual Blocks', () => {
    let accId: string;

    beforeEach(async () => {
      const accommodation = await dataSource.getRepository(Accommodation).findOne({ where: {} });
      accId = accommodation!.id;
    });

    it('should create manual block', async () => {
      const payload = {
        startDate: '2025-08-15',
        endDate: '2025-08-22',
        notes: 'Host vacation',
      };

      const res = await request(app.getHttpServer())
        .post(`/accommodations/${accId}/blocks`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(payload)
        .expect(201);

      expect(res.body.reason).toBe('MANUAL');
    });

    it('should delete manual block', async () => {
      const create = await request(app.getHttpServer())
        .post(`/accommodations/${accId}/blocks`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-11-05',
          endDate: '2025-11-08',
        })
        .expect(201);

      const blockId = create.body.id;

      await request(app.getHttpServer())
        .delete(`/accommodations/${accId}/blocks/${blockId}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(204);
    });

    it('should return 404 when deleting non-existent block', async () => {
      await request(app.getHttpServer())
        .delete(`/accommodations/${accId}/blocks/00000000-0000-0000-0000-000000000000`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(404);
    });
  });
});
