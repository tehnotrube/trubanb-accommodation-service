import request from 'supertest';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { Accommodation } from '../../src/accommodations/entities/accommodation.entity';
import { accommodationsFixture } from './fixtures/accommodations.fixtures';
import { app } from '../utils/setup-tests';
import { PaginatedResponse } from 'src/common/types/PaginatedResponse';

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
    it('returns 200 with paginated data', async () => {
      const response = await request(app.getHttpServer())
        .get('/accommodations')
        .expect(200);

      const paginatedResponse = response.body as PaginatedResponse<Accommodation>;

      expect(paginatedResponse.data).toHaveLength(accommodationsFixture.length);
      expect(paginatedResponse.total).toBe(accommodationsFixture.length);
      expect(paginatedResponse.page).toBe(1);
      expect(paginatedResponse.pageSize).toBe(20);
    });

    it('returns correct data with pagination params', async () => {
      const response = await request(app.getHttpServer())
        .get('/accommodations?page=1&pageSize=1')
        .expect(200);

      const paginatedResponse = response.body as PaginatedResponse<Accommodation>;

      expect(paginatedResponse.data).toHaveLength(1);
      expect(paginatedResponse.total).toBe(accommodationsFixture.length);
      expect(paginatedResponse.pageSize).toBe(1);
    });

  });

  describe('GET /accommodations/:id', () => {
    it('returns 200 with accommodation details', async () => {
      const accommodations = await dataSource.getRepository(Accommodation).find();
      const id = accommodations[0].id;

      const response = await request(app.getHttpServer())
        .get(`/accommodations/${id}`)
        .expect(200);

      expect(response.body.name).toBe(accommodationsFixture[0].name);
      expect(response.body.location).toBe(accommodationsFixture[0].location);
      expect(response.body).toHaveProperty('photoUrls');
    });

    it('returns 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/accommodations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /accommodations', () => {
    it('creates accommodation and returns 201', async () => {
      const newAccommodation = {
        name: 'New Place',
        location: 'New City',
        amenities: ['wifi'],
        minGuests: 1,
        maxGuests: 2,
        hostId: 'host-new',
        basePrice: 75.0,
      };

      const response = await request(app.getHttpServer())
        .post('/accommodations')
        .send(newAccommodation)
        .expect(201);

      expect(response.body.name).toBe(newAccommodation.name);
      expect(response.body.location).toBe(newAccommodation.location);
      expect(response.body.photoKeys).toEqual([]);
      expect(response.body.photoUrls).toEqual([]);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('returns 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/accommodations')
        .send({ name: 'Missing fields' })
        .expect(400);
    });
  });

  describe('PUT /accommodations/:id', () => {
    it('updates accommodation and returns 200', async () => {
      const accommodations = await dataSource.getRepository(Accommodation).find();
      const id = accommodations[0].id;

      const response = await request(app.getHttpServer())
        .put(`/accommodations/${id}`)
        .send({ name: 'Updated Name', basePrice: 200.0 })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.basePrice).toBe(200);
    });

    it('returns 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .put('/accommodations/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /accommodations/:id', () => {
    it('deletes accommodation and returns 200', async () => {
      const accommodations = await dataSource.getRepository(Accommodation).find();
      const id = accommodations[0].id;

      await request(app.getHttpServer())
        .delete(`/accommodations/${id}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/accommodations/${id}`)
        .expect(404);
    });
  });

  describe('POST /accommodations/:id/photos', () => {
    it('uploads photos and returns updated accommodation', async () => {
      const accommodations = await dataSource.getRepository(Accommodation).find();
      const id = accommodations[0].id;

      const response = await request(app.getHttpServer())
        .post(`/accommodations/${id}/photos`)
        .attach('photos', Buffer.from('fake-image-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(response.body.photoKeys).toHaveLength(1);
      expect(response.body.photoUrls).toHaveLength(1);
      expect(response.body.photoKeys[0]).toContain(`${id}/`);
      expect(response.body.photoKeys[0]).toContain('.jpg');
    });

    it('uploads multiple photos', async () => {
      const accommodations = await dataSource.getRepository(Accommodation).find();
      const id = accommodations[0].id;

      const response = await request(app.getHttpServer())
        .post(`/accommodations/${id}/photos`)
        .attach('photos', Buffer.from('fake-image-1'), {
          filename: 'test1.jpg',
          contentType: 'image/jpeg',
        })
        .attach('photos', Buffer.from('fake-image-2'), {
          filename: 'test2.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(response.body.photoKeys).toHaveLength(2);
      expect(response.body.photoUrls).toHaveLength(2);
    });

    it('returns 404 for non-existent accommodation', async () => {
      await request(app.getHttpServer())
        .post('/accommodations/00000000-0000-0000-0000-000000000000/photos')
        .attach('photos', Buffer.from('fake-image'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(404);
    });
  });

  describe('DELETE /accommodations/:id/photos', () => {
    it('deletes photo and returns updated accommodation', async () => {
      const accommodations = await dataSource.getRepository(Accommodation).find();
      const id = accommodations[0].id;

      const uploadResponse = await request(app.getHttpServer())
        .post(`/accommodations/${id}/photos`)
        .attach('photos', Buffer.from('fake-image'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const photoKey = uploadResponse.body.photoKeys[0];

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/accommodations/${id}/photos`)
        .query({ key: photoKey })
        .expect(200);

      expect(deleteResponse.body.photoKeys).toHaveLength(0);
      expect(deleteResponse.body.photoUrls).toHaveLength(0);
    });

    it('returns 404 for non-existent photo', async () => {
      const accommodations = await dataSource.getRepository(Accommodation).find();
      const id = accommodations[0].id;

      await request(app.getHttpServer())
        .delete(`/accommodations/${id}/photos`)
        .query({ key: 'non-existent-key.jpg' })
        .expect(404);
    });
  });
});
