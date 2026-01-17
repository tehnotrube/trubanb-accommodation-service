import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AccommodationsService } from './accommodations.service';
import { Accommodation } from './entities/accommodation.entity';
import {
  AccommodationRule,
  PeriodType,
} from './entities/accommodation-rule.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';
import { StorageService } from '../storage/storage.service';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { CreateManualBlockDto } from './dto/create-manual-block.dto';

describe('AccommodationsService', () => {
  let service: AccommodationsService;
  let accommodationRepo: jest.Mocked<Repository<Accommodation>>;
  let ruleRepo: jest.Mocked<Repository<AccommodationRule>>;
  let blockedRepo: jest.Mocked<Repository<BlockedPeriod>>;
  let storageService: jest.Mocked<StorageService>;

  const HOST_EMAIL = 'host@example.com';
  const OTHER_EMAIL = 'other@example.com';

  const mockAccommodation = (
    partial: Partial<Accommodation> = {},
  ): Accommodation =>
    ({
      id: 'acc_01JTESTACCOM001',
      name: 'Test Apartment',
      location: 'Belgrade',
      basePrice: 89.99,
      minGuests: 2,
      maxGuests: 6,
      hostId: HOST_EMAIL,
      amenities: ['WiFi', 'Kitchen'],
      photoKeys: ['photos/acc1/1.jpg'],
      autoApprove: false,
      isPerUnit: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    }) as Accommodation;

  const mockRule = (
    partial: Partial<AccommodationRule> = {},
  ): AccommodationRule =>
    ({
      id: 'rule_01JTESTRULE001',
      accommodationId: 'acc_01JTESTACCOM001',
      startDate: new Date('2025-12-20'),
      endDate: new Date('2026-01-10'),
      overridePrice: null,
      multiplier: 1.35,
      periodType: 'SEASONAL',
      ...partial,
    }) as AccommodationRule;

  const mockBlockedPeriod = (
    partial: Partial<BlockedPeriod> = {},
  ): BlockedPeriod =>
    ({
      id: 'blk_01JTESTBLOCK001',
      accommodationId: 'acc_01JTESTACCOM001',
      startDate: new Date('2025-07-15'),
      endDate: new Date('2025-07-20'),
      reason: 'MANUAL',
      ...partial,
    }) as BlockedPeriod;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccommodationsService,
        {
          provide: getRepositoryToken(Accommodation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            findOneBy: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AccommodationRule),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BlockedPeriod),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            getPublicUrls: jest.fn(),
            uploadFiles: jest.fn(),
            deleteFiles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AccommodationsService);
    accommodationRepo = module.get(getRepositoryToken(Accommodation));
    ruleRepo = module.get(getRepositoryToken(AccommodationRule));
    blockedRepo = module.get(getRepositoryToken(BlockedPeriod));
    storageService = module.get(StorageService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create accommodation with empty photoKeys', async () => {
      const dto: CreateAccommodationDto = {
        name: 'New Studio',
        location: 'Novi Sad',
        basePrice: 65,
        minGuests: 1,
        maxGuests: 3,
        hostId: HOST_EMAIL,
        amenities: ['WiFi'],
      };

      const entity = mockAccommodation({ ...dto, photoKeys: [] });
      accommodationRepo.create.mockReturnValue(entity);
      accommodationRepo.save.mockResolvedValue({ ...entity, id: 'new-id' });
      storageService.getPublicUrls.mockReturnValue([]);

      const result = await service.create(dto);

      expect(result.id).toBe('new-id');
      expect(result.photoUrls).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should throw when accommodation not found', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('wrong-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update fields and return transformed dto', async () => {
      const entity = mockAccommodation();
      accommodationRepo.findOneBy.mockResolvedValue(entity);
      accommodationRepo.save.mockResolvedValue({
        ...entity,
        name: 'Updated Name',
      });
      storageService.getPublicUrls.mockReturnValue(['url1.jpg']);

      const result = await service.update(entity.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(result.photoUrls).toEqual(['url1.jpg']);
    });
  });

  describe('remove', () => {
    it('should delete photos when they exist', async () => {
      const entity = mockAccommodation();
      accommodationRepo.findOneBy.mockResolvedValue(entity);

      await service.remove(entity.id);

      expect(storageService.deleteFiles).toHaveBeenCalledWith(entity.photoKeys);
      expect(accommodationRepo.remove).toHaveBeenCalledWith(entity);
    });
  });

  describe('uploadPhotos', () => {
    it('should append new photo keys', async () => {
      const entity = mockAccommodation();
      const newKeys = ['new/1.jpg', 'new/2.jpg'];

      accommodationRepo.findOneBy.mockResolvedValue(entity);
      storageService.uploadFiles.mockResolvedValue(newKeys);
      accommodationRepo.save.mockResolvedValue({
        ...entity,
        photoKeys: [...entity.photoKeys, ...newKeys],
      });
      storageService.getPublicUrls.mockReturnValue([
        'old.jpg',
        'new1.jpg',
        'new2.jpg',
      ]);

      const result = await service.uploadPhotos(
        entity.id,
        [] as any,
        HOST_EMAIL,
      );

      expect(result.photoUrls).toHaveLength(3);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //                        RULES - createRule
  // ────────────────────────────────────────────────────────────────

  describe('createRule', () => {
    it('should throw when user is not owner', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(mockAccommodation());

      await expect(
        service.createRule('acc-id', {} as any, OTHER_EMAIL),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when period overlaps with existing rule', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      ruleRepo.count.mockResolvedValue(1);

      await expect(
        service.createRule(
          'acc-id',
          {
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-31'),
          } as CreateRuleDto,
          HOST_EMAIL,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when period contains active reservation', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      ruleRepo.count.mockResolvedValue(0);
      blockedRepo.count.mockResolvedValue(1);

      await expect(
        service.createRule(
          'acc-id',
          {
            startDate: new Date('2025-07-10'),
            endDate: new Date('2025-07-25'),
          } as CreateRuleDto,
          HOST_EMAIL,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create rule with default multiplier', async () => {
      const dto: CreateRuleDto = {
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-31'),
        periodType: PeriodType.SEASONAL,
      };

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      ruleRepo.count.mockResolvedValue(0);
      blockedRepo.count.mockResolvedValue(0);
      ruleRepo.create.mockReturnValue({ ...dto, id: 'new-rule' } as any);
      ruleRepo.save.mockResolvedValue({
        id: 'new-rule',
        ...dto,
        multiplier: 1.0,
      } as any);

      const result = await service.createRule('acc-id', dto, HOST_EMAIL);

      expect(result.multiplier).toBe(1.0);
      expect(result.id).toBe('new-rule');
    });
  });

  describe('updateRule', () => {
    it('should throw when rule not found', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRule('acc-id', 'rule-id', {}, HOST_EMAIL),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when trying to change period to overlapping one', async () => {
      const existingRule = mockRule();

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      ruleRepo.findOne.mockResolvedValue(existingRule);
      ruleRepo.count.mockResolvedValue(1); // overlapping exists

      await expect(
        service.updateRule(
          'acc-id',
          'rule-id',
          { startDate: new Date('2025-12-15') },
          HOST_EMAIL,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRule', () => {
    it('should throw when trying to delete rule with active reservation', async () => {
      const rule = mockRule();

      ruleRepo.findOne.mockResolvedValue(rule);
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      blockedRepo.count.mockResolvedValue(1);

      await expect(
        service.deleteRule('acc-id', 'rule-id', HOST_EMAIL),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createManualBlock', () => {
    it('should create manual block when no conflicts', async () => {
      const dto: CreateManualBlockDto = {
        startDate: new Date('2025-09-05'),
        endDate: new Date('2025-09-12'),
        notes: 'Host vacation',
      };

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      blockedRepo.count.mockResolvedValue(0);
      blockedRepo.create.mockReturnValue({ ...dto, reason: 'MANUAL' } as any);
      blockedRepo.save.mockResolvedValue({
        id: 'new-block',
        ...dto,
        reason: 'MANUAL',
      } as any);

      const result = await service.createManualBlock('acc-id', dto, HOST_EMAIL);

      expect(result.reason).toBe('MANUAL');
      expect(result.id).toBe('new-block');
    });

    it('should throw when period has active reservations', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_EMAIL }),
      );
      blockedRepo.count.mockResolvedValue(1);

      await expect(
        service.createManualBlock('acc-id', {} as any, HOST_EMAIL),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteManualBlock', () => {
    it('should throw when block is not MANUAL or not found', async () => {
      blockedRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteManualBlock('acc-id', 'wrong-block', HOST_EMAIL),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
