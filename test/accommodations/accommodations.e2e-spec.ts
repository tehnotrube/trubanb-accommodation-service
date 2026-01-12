import request from 'supertest';
import { DataSource } from 'typeorm';
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

  it('GET /accommodations returns 200 with correct seeded data', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/accommodations')
      .expect(200);

    const paginatedResponse = response.body as PaginatedResponse<Accommodation>;

    const accommodations = paginatedResponse.data;

    expect(Array.isArray(accommodations)).toBe(true);
    expect(accommodations).toHaveLength(accommodationsFixture.length);

    const first = accommodations[0];

    expect(first).toMatchObject({
      name: accommodationsFixture[0].name,
      location: accommodationsFixture[0].location,
      amenities: expect.arrayContaining(
        accommodationsFixture[0].amenities,
      ) as string[],
      minGuests: accommodationsFixture[0].minGuests,
      maxGuests: accommodationsFixture[0].maxGuests,
      hostId: accommodationsFixture[0].hostId,
      autoApprove: accommodationsFixture[0].autoApprove,
      basePrice: accommodationsFixture[0].basePrice.toFixed(2),
    });
  });
});
