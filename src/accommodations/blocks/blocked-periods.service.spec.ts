import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BlockedPeriodsService } from './blocked-periods.service';
import { BlockedPeriod } from '../entities/blocked-period.entity';
import { Accommodation } from '../entities/accommodation.entity';
import { CreateManualBlockDto } from '../dto/create-manual-block.dto';

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
    it('should throw when user is not owner', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(mockAccommodation());

      await expect(
        service.createManualBlock(
          'acc-id',
          {} as CreateManualBlockDto,
          OTHER_EMAIL,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when startDate >= endDate', async () => {
      const dto: CreateManualBlockDto = {
        startDate: new Date('2025-08-22'),
        endDate: new Date('2025-08-15'),
      };

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );

      await expect(
        service.createManualBlock('acc-id', dto, HOST_EMAIL),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when period has active reservations', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      blockedRepo.count.mockResolvedValue(1); // has reservation

      const dto: CreateManualBlockDto = {
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-10'),
      };

      await expect(
        service.createManualBlock('acc-id', dto, HOST_EMAIL),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create manual block', async () => {
      const dto: CreateManualBlockDto = {
        startDate: new Date('2025-09-05'),
        endDate: new Date('2025-09-12'),
        notes: 'Host vacation',
      };

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      blockedRepo.count.mockResolvedValue(0);

      const createdBlock = {
        id: 'new-block',
        ...dto,
        reason: 'MANUAL',
      } as BlockedPeriod;
      blockedRepo.create.mockReturnValue(createdBlock);
      blockedRepo.save.mockResolvedValue(createdBlock);

      const result = await service.createManualBlock('acc-id', dto, HOST_EMAIL);

      expect(result.id).toBe('new-block');
      expect(result.reason).toBe('MANUAL');
      expect(result.notes).toBe('Host vacation');
    });
  });

  describe('deleteManualBlock', () => {
    it('should throw when block not found or not MANUAL', async () => {
      blockedRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteManualBlock('acc-id', 'wrong-block', HOST_EMAIL),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when user is not owner', async () => {
      const block = mockBlock();

      blockedRepo.findOne.mockResolvedValue(block);
      accommodationRepo.findOneBy.mockResolvedValue(mockAccommodation());

      await expect(
        service.deleteManualBlock('acc-id', block.id, OTHER_EMAIL),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully delete manual block', async () => {
      const block = mockBlock();

      blockedRepo.findOne.mockResolvedValue(block);
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );

      await service.deleteManualBlock('acc-id', block.id, HOST_EMAIL);

      expect(blockedRepo.remove).toHaveBeenCalledWith(block);
    });
  });
});
