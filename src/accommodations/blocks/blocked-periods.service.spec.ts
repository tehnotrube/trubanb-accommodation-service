import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedPeriodsService } from './blocked-periods.service';
import { BlockedPeriod } from '../entities/blocked-period.entity';
import { Accommodation } from '../entities/accommodation.entity';

describe('BlockedPeriodsService (manual blocks)', () => {
  let service: BlockedPeriodsService;
  let blockedRepo: jest.Mocked<Repository<BlockedPeriod>>;
  let accommodationRepo: jest.Mocked<Repository<Accommodation>>;

  const HOST_EMAIL = 'host@example.com';
  const OTHER_EMAIL = 'other@example.com';

  const mockAccommodation = (
    partial: Partial<Accommodation> = {},
  ): Accommodation =>
    ({
      id: 'acc_01JTESTACCOM001',
      name: 'Test Apartment',
      hostId: HOST_EMAIL,
      ...partial,
    }) as Accommodation;

  const mockBlock = (partial: Partial<BlockedPeriod> = {}): BlockedPeriod =>
    ({
      id: 'blk_01JTESTBLOCK001',
      accommodationId: 'acc_01JTESTACCOM001',
      startDate: new Date('2025-07-15'),
      endDate: new Date('2025-07-20'),
      reason: 'MANUAL',
      notes: 'Host vacation',
      ...partial,
    }) as BlockedPeriod;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockedPeriodsService,
        {
          provide: getRepositoryToken(BlockedPeriod),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Accommodation),
          useValue: {
            findOneBy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(BlockedPeriodsService);
    blockedRepo = module.get(getRepositoryToken(BlockedPeriod));
    accommodationRepo = module.get(getRepositoryToken(Accommodation));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createManualBlock', () => {
 
  });
});
