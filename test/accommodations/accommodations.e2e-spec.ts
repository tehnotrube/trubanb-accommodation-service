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
import { App } from 'supertest/types';
import { PaginatedResponse } from 'src/common/types/PaginatedResponse';
import { AccommodationResponseDto } from 'src/accommodations/dto/accommodation.response.dto';
import { RuleResponseDto } from 'src/accommodations/dto/rule.response.dto';
import { BlockResponseDto } from 'src/accommodations/dto/block.response.dto';

describe('Accommodations (e2e)', () => {
  let dataSource: DataSource;
  const seededAccommodations: Accommodation[] = [];

  beforeAll(async () => {
    dataSource = app.get(DataSource);

    // Seed all fixture accommodations once
    for (const fixture of accommodationsFixture) {
      const acc = await dataSource.manager.save(Accommodation, { ...fixture });
      seededAccommodations.push(acc);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /accommodations - list & pagination', () => {
    it('should return paginated list with default values', async () => {
      const res = await request(app.getHttpServer() as App)
        .get('/accommodations')
        .expect(200);

      const body = res.body as PaginatedResponse<AccommodationResponseDto>;

      expect(body.data).toHaveLength(accommodationsFixture.length);
      expect(body.total).toBe(accommodationsFixture.length);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.data[0]).not.toHaveProperty('photoKeys');
    });

    it('should respect custom page and pageSize', async () => {
      const res = await request(app.getHttpServer() as App)
        .get('/accommodations?page=1&pageSize=1')
        .expect(200);

      const body = res.body as PaginatedResponse<AccommodationResponseDto>;

      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(accommodationsFixture.length);
    });

    it('should return empty data when page is out of range', async () => {
      const res = await request(app.getHttpServer() as App)
        .get('/accommodations?page=999&pageSize=10')
        .expect(200);

      const body = res.body as PaginatedResponse<AccommodationResponseDto>;

      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(accommodationsFixture.length);
    });
  });

  describe('GET /accommodations/:id', () => {
    it('should return accommodation by id', async () => {
      const id = seededAccommodations[0].id;

      const res = await request(app.getHttpServer() as App)
        .get(`/accommodations/${id}`)
        .expect(200);

      const body = res.body as AccommodationResponseDto;

      expect(body.id).toBe(id);
      expect(body.name).toBe(accommodationsFixture[0].name);
      expect(body.location).toBe(accommodationsFixture[0].location);
      expect(body).toHaveProperty('photoUrls');
      expect(body).not.toHaveProperty('photoKeys');
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer() as App)
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
      const res = await request(app.getHttpServer() as App)
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(validPayload)
        .expect(201);

      const body = res.body as AccommodationResponseDto;

      expect(body).toMatchObject({
        name: validPayload.name,
        location: validPayload.location,
        amenities: expect.arrayContaining(validPayload.amenities) as string[],
        photoUrls: [],
        basePrice: validPayload.basePrice,
        autoApprove: validPayload.autoApprove,
      });
      expect(body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer() as App)
        .post('/accommodations')
        .send(validPayload)
        .expect(401);
    });

    it('should reject guest role', async () => {
      await request(app.getHttpServer() as App)
        .post('/accommodations')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .send(validPayload)
        .expect(403);
    });

    it('should reject negative price', async () => {
      await request(app.getHttpServer() as App)
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ ...validPayload, basePrice: -10 })
        .expect(400);
    });

    it('should reject minGuests greater than maxGuests', async () => {
      await request(app.getHttpServer() as App)
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ ...validPayload, minGuests: 5, maxGuests: 3 })
        .expect(400);
    });
  });

  describe('PUT /accommodations/:id', () => {
    let testAccommodation: Accommodation;

    beforeEach(async () => {
      testAccommodation = await dataSource.manager.save(Accommodation, {
        ...accommodationsFixture[0],
      });
    });

    it('should update accommodation', async () => {
      const updateData = {
        name: 'Renamed Wonderful Place',
        basePrice: 220.0,
        autoApprove: true,
      };

      const res = await request(app.getHttpServer() as App)
        .put(`/accommodations/${testAccommodation.id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(updateData)
        .expect(200);

      const body = res.body as AccommodationResponseDto;

      expect(body.name).toBe(updateData.name);
      expect(body.basePrice).toBe(updateData.basePrice);
      expect(body.autoApprove).toBe(true);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer() as App)
        .put('/accommodations/00000000-0000-0000-0000-000000000000')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /accommodations/:id', () => {
    let testAccommodation: Accommodation;

    beforeEach(async () => {
      testAccommodation = await dataSource.manager.save(Accommodation, {
        ...accommodationsFixture[0],
      });
    });

    it('should delete accommodation', async () => {
      await request(app.getHttpServer() as App)
        .delete(`/accommodations/${testAccommodation.id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(204);

      const exists = await dataSource
        .getRepository(Accommodation)
        .findOneBy({ id: testAccommodation.id });
      expect(exists).toBeNull();
    });
  });

  describe('POST /accommodations/:id/photos', () => {
    let testAccommodation: Accommodation;

    beforeEach(async () => {
      testAccommodation = await dataSource.manager.save(Accommodation, {
        ...accommodationsFixture[0],
      });
    });

    it('should upload single photo', async () => {
      const res = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/photos`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake-image'), {
          filename: 'living-room.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      const body = res.body as AccommodationResponseDto;

      expect(body.photoUrls).toHaveLength(1);
      expect(body.photoUrls![0]).toContain('http');
    });

    it('should upload multiple photos', async () => {
      const res = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/photos`)
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

      const body = res.body as AccommodationResponseDto;

      expect(body.photoUrls).toHaveLength(2);
    });

    it('should reject non-image file', async () => {
      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/photos`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('hello'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('should return 404 for non-existent accommodation', async () => {
      await request(app.getHttpServer() as App)
        .post('/accommodations/00000000-0000-0000-0000-000000000000/photos')
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake'), 'test.jpg')
        .expect(404);
    });

    it('should forbid upload by different host', async () => {
      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/photos`)
        .set(TEST_OTHER_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake'), 'test.jpg')
        .expect(403);
    });
  });

  describe('Rules', () => {
    let testAccommodation: Accommodation;

    beforeEach(async () => {
      testAccommodation = await dataSource.manager.save(Accommodation, {
        ...accommodationsFixture[0],
      });
    });

    it('should create rule', async () => {
      const payload = {
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        overridePrice: 150,
        multiplier: 1.4,
        periodType: PeriodType.SEASONAL,
      };

      const res = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(payload)
        .expect(201);

      const body = res.body as RuleResponseDto;

      expect(body.multiplier).toBe('1.40');
      expect(body.periodType).toBe(payload.periodType);
    });

    it('should reject overlapping rule', async () => {
      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2027-01-15',
          endDate: '2027-02-15',
          multiplier: 1.3,
          periodType: PeriodType.SEASONAL,
        })
        .expect(201);

      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2027-01-01',
          endDate: '2027-01-31',
          multiplier: 1.0,
        })
        .expect(400);
    });

    it('should reject rule with endDate before startDate', async () => {
      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-12-20',
          endDate: '2025-12-10',
          multiplier: 1.0,
        })
        .expect(400);
    });

    it('should update rule', async () => {
      const create = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-07-01',
          endDate: '2025-07-31',
          multiplier: 1.2,
        })
        .expect(201);

      const rule = create.body as RuleResponseDto;

      const updateRes = await request(app.getHttpServer() as App)
        .patch(`/accommodations/${testAccommodation.id}/rules/${rule.id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ multiplier: 1.65, overridePrice: 180 })
        .expect(200);

      const updatedBody = updateRes.body as RuleResponseDto;

      expect(updatedBody.multiplier).toBe(1.65);
      expect(updatedBody.overridePrice).toBe(180);
    });

    it('should reject update to overlapping period', async () => {
      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          multiplier: 1.0,
        })
        .expect(201);

      const create = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-02-01',
          endDate: '2025-02-28',
          multiplier: 1.2,
        })
        .expect(201);

      const rule = create.body as RuleResponseDto;

      await request(app.getHttpServer() as App)
        .patch(`/accommodations/${testAccommodation.id}/rules/${rule.id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-01-15',
          endDate: '2025-02-15',
        })
        .expect(400);
    });

    it('should list rules', async () => {
      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2028-01-01',
          endDate: '2028-01-31',
          multiplier: 1.3,
          periodType: PeriodType.SEASONAL,
        })
        .expect(201);

      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2028-06-01',
          endDate: '2028-08-31',
          multiplier: 1.5,
        })
        .expect(201);

      const res = await request(app.getHttpServer() as App)
        .get(`/accommodations/${testAccommodation.id}/rules`)
        .expect(200);

      const body = res.body as RuleResponseDto[];

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
    });

    it('should delete rule', async () => {
      const create = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/rules`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-03-01',
          endDate: '2025-03-15',
          multiplier: 1.0,
        })
        .expect(201);

      const rule = create.body as RuleResponseDto;

      await request(app.getHttpServer() as App)
        .delete(`/accommodations/${testAccommodation.id}/rules/${rule.id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(204);
    });

    it('should return 404 when deleting non-existent rule', async () => {
      await request(app.getHttpServer() as App)
        .delete(
          `/accommodations/${testAccommodation.id}/rules/00000000-0000-0000-0000-000000000000`,
        )
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(404);
    });
  });

  describe('Manual Blocks', () => {
    let testAccommodation: Accommodation;

    beforeEach(async () => {
      testAccommodation = await dataSource.manager.save(Accommodation, {
        ...accommodationsFixture[0],
      });
    });

    it('should create manual block', async () => {
      const payload = {
        startDate: '2025-08-15',
        endDate: '2025-08-22',
        notes: 'Host vacation',
      };

      const res = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/blocks`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(payload)
        .expect(201);

      const body = res.body as BlockResponseDto;
      expect(new Date(body.startDate).toISOString().split('T')[0]).toBe(
        payload.startDate,
      );
      expect(new Date(body.endDate).toISOString().split('T')[0]).toBe(
        payload.endDate,
      );
      expect(body.reason).toBe('MANUAL');
    });

    it('should reject block with endDate before startDate', async () => {
      await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/blocks`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-08-22',
          endDate: '2025-08-15',
        })
        .expect(400);
    });

    it('should delete manual block', async () => {
      const create = await request(app.getHttpServer() as App)
        .post(`/accommodations/${testAccommodation.id}/blocks`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({
          startDate: '2025-11-05',
          endDate: '2025-11-08',
        })
        .expect(201);

      const block = create.body as BlockResponseDto;

      await request(app.getHttpServer() as App)
        .delete(`/accommodations/${testAccommodation.id}/blocks/${block.id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(204);
    });

    it('should return 404 when deleting non-existent block', async () => {
      await request(app.getHttpServer() as App)
        .delete(
          `/accommodations/${testAccommodation.id}/blocks/00000000-0000-0000-0000-000000000000`,
        )
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(404);
    });
  });
});
