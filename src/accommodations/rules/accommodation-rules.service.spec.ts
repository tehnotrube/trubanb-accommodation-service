import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AccommodationRulesService } from './accommodation-rules.service';
import {
  AccommodationRule,
  PeriodType,
} from '../entities/accommodation-rule.entity';
import { Accommodation } from '../entities/accommodation.entity';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { BlockedPeriod } from '../entities/blocked-period.entity';

describe('AccommodationRulesService', () => {
  let service: AccommodationRulesService;
  let ruleRepo: jest.Mocked<Repository<AccommodationRule>>;
  let accommodationRepo: jest.Mocked<Repository<Accommodation>>;
  let blockedRepo: jest.Mocked<Repository<any>>; // we mock blockedRepo only for checkNoActiveReservations

  const HOST_ID = 'host-123';
  const OTHER_ID = 'host-456';

  const mockAccommodation = (
    partial: Partial<Accommodation> = {},
  ): Accommodation =>
    ({
      id: 'acc_01JTESTACCOM001',
      name: 'Test Apartment',
      location: 'Belgrade',
      hostId: HOST_ID,
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
      periodType: PeriodType.SEASONAL,
      ...partial,
    }) as AccommodationRule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccommodationRulesService,
        {
          provide: getRepositoryToken(AccommodationRule),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
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
        // Mock BlockedPeriod repository only for checkNoActiveReservations
        {
          provide: getRepositoryToken(BlockedPeriod),
          useValue: {
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AccommodationRulesService);
    ruleRepo = module.get(getRepositoryToken(AccommodationRule));
    accommodationRepo = module.get(getRepositoryToken(Accommodation));
    blockedRepo = module.get(getRepositoryToken(BlockedPeriod));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createRule', () => {
    it('should throw when user is not owner', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(mockAccommodation());

      await expect(
        service.createRule('acc-id', {} as CreateRuleDto, OTHER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when startDate >= endDate', async () => {
      const dto: CreateRuleDto = {
        startDate: new Date('2025-12-20'),
        endDate: new Date('2025-12-10'),
      } as CreateRuleDto;

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_ID }),
      );

      await expect(service.createRule('acc-id', dto, HOST_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when period overlaps with existing rule', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_ID }),
      );
      blockedRepo.count.mockResolvedValue(0);
      ruleRepo.count.mockResolvedValue(1);

      const dto: CreateRuleDto = {
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-31'),
      };

      await expect(service.createRule('acc-id', dto, HOST_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when period contains active reservation', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_ID }),
      );
      blockedRepo.count.mockResolvedValue(1);

      const dto: CreateRuleDto = {
        startDate: new Date('2025-07-10'),
        endDate: new Date('2025-07-25'),
      };

      await expect(service.createRule('acc-id', dto, HOST_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully create rule with default multiplier', async () => {
      const dto: CreateRuleDto = {
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-31'),
        periodType: PeriodType.SEASONAL,
      };

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_ID }),
      );
      blockedRepo.count.mockResolvedValue(0);
      ruleRepo.count.mockResolvedValue(0);

      const createdRule = {
        id: 'new-rule',
        ...dto,
        multiplier: 1.0,
      } as AccommodationRule;
      ruleRepo.create.mockReturnValue(createdRule);
      ruleRepo.save.mockResolvedValue(createdRule);

      const result = await service.createRule('acc-id', dto, HOST_ID);

      expect(result.id).toBe('new-rule');
      expect(result.multiplier).toBe(1.0);
      expect(ruleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accommodationId: 'acc-id',
          multiplier: 1.0,
        }),
      );
    });
  });

  describe('updateRule', () => {
    it('should throw when rule not found', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRule('acc-id', 'rule-id', {} as UpdateRuleDto, HOST_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when trying to change period to overlapping one', async () => {
      const existingRule = mockRule();

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_ID }),
      );
      ruleRepo.findOne.mockResolvedValue(existingRule);
      blockedRepo.count.mockResolvedValue(0);
      ruleRepo.count.mockResolvedValue(1); // overlapping exists

      await expect(
        service.updateRule(
          'acc-id',
          'rule-id',
          { startDate: new Date('2025-12-15') } as UpdateRuleDto,
          HOST_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update rule', async () => {
      const existingRule = mockRule({ multiplier: 1.2 });

      accommodationRepo.findOneBy.mockResolvedValue(
        mockAccommodation({ hostId: HOST_ID }),
      );
      ruleRepo.findOne.mockResolvedValue(existingRule);
      blockedRepo.count.mockResolvedValue(0);
      ruleRepo.count.mockResolvedValue(0);

      const updatedRule = {
        ...existingRule,
        multiplier: 1.65,
        overridePrice: 180,
      };
      ruleRepo.save.mockResolvedValue(updatedRule);

      const result = await service.updateRule(
        'acc-id',
        'rule-id',
        { multiplier: 1.65, overridePrice: 180 } as UpdateRuleDto,
        HOST_ID,
      );

      expect(result.multiplier).toBe(1.65);
      expect(result.overridePrice).toBe(180);
    });
  });
});
