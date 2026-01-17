import request from 'supertest';
import { DataSource } from 'typeorm';
import { Accommodation } from '../../src/accommodations/entities/accommodation.entity';
import { accommodationsFixture } from './fixtures/accommodations.fixtures';
import { app } from '../utils/setup-tests';
import { PaginatedResponse } from 'src/common/types/PaginatedResponse';
import { AccommodationResponseDto } from 'src/accommodations/dto/accommodation.response.dto';
import { App } from 'supertest/types';
import { TEST_HOST_TOKEN_HEADERS } from '../utils/auth/headers.utils';

describe('Accommodations (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(() => {
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('BEGIN;');
    await dataSource.getRepository(Accommodation).save(accommodationsFixture);
  });

  afterEach(async () => {
    await dataSource.query('ROLLBACK;');
  });

  describe('GET /accommodations', () => {
    it('should return 200 with paginated DTOs', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/accommodations')
        .expect(200);

      const body = response.body as PaginatedResponse<any>;

      expect(body.data).toHaveLength(accommodationsFixture.length);
      expect(body.total).toBe(accommodationsFixture.length);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);

      expect(body.data[0]).toHaveProperty('id');
      expect(body.data[0]).toHaveProperty('name');
      expect(body.data[0]).toHaveProperty('photoUrls');
      expect(body.data[0]).not.toHaveProperty('photoKeys');
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/accommodations?page=1&pageSize=1')
        .expect(200);

      const body = response.body as PaginatedResponse<any>;

      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(accommodationsFixture.length);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(1);
    });
  });

  describe('GET /accommodations/:id', () => {
    it('should return 200 with accommodation DTO', async () => {
      const accommodations = await dataSource
        .getRepository(Accommodation)
        .find();
      const id = accommodations[0].id;

      const response = await request(app.getHttpServer() as App)
        .get(`/accommodations/${id}`)
        .expect(200);

      const responseBody = response.body as AccommodationResponseDto;

      expect(responseBody.name).toBe(accommodationsFixture[0].name);
      expect(responseBody.location).toBe(accommodationsFixture[0].location);
      expect(responseBody).toHaveProperty('photoUrls');
      expect(responseBody).not.toHaveProperty('photoKeys');
      expect(responseBody).toHaveProperty('createdAt');
      expect(responseBody).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer() as App)
        .get('/accommodations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /accommodations', () => {
    it('should create accommodation and return 201 with DTO', async () => {
      const newAccommodation = {
        name: 'New Modern Loft',
        location: 'Novi Sad',
        amenities: ['wifi', 'balcony'],
        minGuests: 1,
        maxGuests: 3,
        hostId: 'host-new-789',
        basePrice: 95.5,
        isPerUnit: true
      };

      const response = await request(app.getHttpServer() as App)
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(newAccommodation)
        .expect(201);

      expect(response.body).toMatchObject({
        name: newAccommodation.name,
        location: newAccommodation.location,
        amenities: expect.arrayContaining(
          newAccommodation.amenities,
        ) as string[],
        photoUrls: [],
        minGuests: newAccommodation.minGuests,
        maxGuests: newAccommodation.maxGuests,
        hostId: newAccommodation.hostId,
        basePrice: newAccommodation.basePrice,
      });

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).not.toHaveProperty('photoKeys');
    });

    it('should return 400 for invalid/missing data', async () => {
      await request(app.getHttpServer() as App)
        .post('/accommodations')
        .set(TEST_HOST_TOKEN_HEADERS)
        .send({ name: 'Missing required fields' })
        .expect(400);
    });
  });

  describe('PUT /accommodations/:id', () => {
    it('should update and return 200 with updated DTO', async () => {
      const [first] = await dataSource.getRepository(Accommodation).find();
      const id = first.id;

      const updateData = {
        name: 'Renamed Wonderful Place',
        basePrice: 220.0,
        autoApprove: true,
      };

      const response = await request(app.getHttpServer() as App)
        .put(`/accommodations/${id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .send(updateData)
        .expect(200);

      const responseBody = response.body as AccommodationResponseDto;

      expect(responseBody.name).toBe(updateData.name);
      expect(responseBody.basePrice).toBe(updateData.basePrice);
      expect(responseBody.autoApprove).toBe(true);
      expect(responseBody).toHaveProperty('photoUrls');
      expect(responseBody).not.toHaveProperty('photoKeys');
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
    it('should delete accommodation and return 204 (or 200)', async () => {
      const [first] = await dataSource.getRepository(Accommodation).find();
      const id = first.id;

      await request(app.getHttpServer() as App)
        .delete(`/accommodations/${id}`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .expect(204);
    });
  });

  describe('POST /accommodations/:id/photos', () => {
    it('should upload single photo and return 200 with updated DTO', async () => {
      const [first] = await dataSource.getRepository(Accommodation).find();
      const id = first.id;

      const response = await request(app.getHttpServer() as App)
        .post(`/accommodations/${id}/photos`)
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake-image-content'), {
          filename: 'living-room.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      const responseBody = response.body as AccommodationResponseDto;

      expect(responseBody.photoUrls).toHaveLength(1);
      expect(responseBody.photoUrls![0]).toContain('http'); // real url
      expect(responseBody).not.toHaveProperty('photoKeys');
    });

    it('should upload multiple photos', async () => {
      const [first] = await dataSource.getRepository(Accommodation).find();
      const id = first.id;

      const response = await request(app.getHttpServer() as App)
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

      const responseBody = response.body as AccommodationResponseDto;

      expect(responseBody.photoUrls).toHaveLength(2);
      expect(responseBody.photoUrls![0]).toContain('.jpg');
      expect(responseBody.photoUrls![1]).toContain('.png');
    });

    it('should return 404 when accommodation does not exist', async () => {
      await request(app.getHttpServer() as App)
        .post('/accommodations/00000000-0000-0000-0000-000000000000/photos')
        .set(TEST_HOST_TOKEN_HEADERS)
        .attach('photos', Buffer.from('fake'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(404);
    });
  });
});
