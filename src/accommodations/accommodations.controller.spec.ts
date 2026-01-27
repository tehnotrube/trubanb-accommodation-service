import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { AccommodationRulesService } from './rules/accommodation-rules.service';
import { BlockedPeriodsService } from './blocks/blocked-periods.service';

import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';
import { AccommodationResponseDto } from './dto/accommodation.response.dto';
import { PaginatedResponse } from '.././common/types/PaginatedResponse';

import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RuleResponseDto } from './dto/rule.response.dto';

import type { AuthenticatedUser } from '.././auth/interfaces/authenticated-user.interface';
import { UserRole } from '.././auth/guards/roles.guard';
import { PeriodType } from './entities/accommodation-rule.entity';

describe('AccommodationsController', () => {
  let controller: AccommodationsController;

  let mockAccommodationsService: jest.Mocked<AccommodationsService>;
  let mockRulesService: jest.Mocked<AccommodationRulesService>;

  const mockUser = (email = 'test.host@example.com'): AuthenticatedUser => ({
    id: 'usr_123456789',
    email,
    role: UserRole.HOST,
  });

  const mockAccommodationResponse = (
    overrides: Partial<AccommodationResponseDto> = {},
  ): AccommodationResponseDto => ({
    id: 'acc_01JMOCKEDACCOM001',
    name: 'Mocked Cozy Apartment',
    location: 'Belgrade',
    basePrice: 95.0,
    minGuests: 2,
    maxGuests: 5,
    hostId: 'hst_01JMOCKEDHOST001',
    amenities: ['WiFi', 'Air Conditioning', 'Kitchen'],
    photoUrls: ['https://cdn.example.com/photo1.jpg'],
    autoApprove: false,
    isPerUnit: false,
    createdAt: new Date('2025-10-01'),
    updatedAt: new Date('2025-10-02'),
    accommodationRules: [],
    blockedPeriods: [],
    ...overrides,
  });

  const mockRuleResponse = (
    overrides: Partial<RuleResponseDto> = {},
  ): RuleResponseDto => ({
    id: 'rule_01JMOCKRULE001',
    startDate: new Date('2025-12-20'),
    endDate: new Date('2026-01-10'),
    multiplier: 1.35,
    periodType: PeriodType.SEASONAL,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccommodationsController],
      providers: [
        {
          provide: AccommodationsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            uploadPhotos: jest.fn(),
          },
        },
        {
          provide: AccommodationRulesService,
          useValue: {
            createRule: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            getRules: jest.fn(),
          },
        },
        {
          provide: BlockedPeriodsService,
          useValue: {
            createManualBlock: jest.fn(),
            deleteManualBlock: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AccommodationsController);
    mockAccommodationsService = module.get(AccommodationsService);
    mockRulesService = module.get(AccommodationRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return accommodation response dto', async () => {
      const createDto: CreateAccommodationDto = {
        name: 'Test Studio',
        location: 'Novi Sad',
        basePrice: 65.0,
        minGuests: 1,
        maxGuests: 3,
        amenities: ['WiFi'],
        autoApprove: false,
        isPerUnit: false,
      };

      const expected = mockAccommodationResponse({
        name: createDto.name,
        basePrice: createDto.basePrice,
      });
      mockAccommodationsService.create.mockResolvedValue(expected);

      const result = await controller.create(createDto, mockUser());

      expect(mockAccommodationsService.create).toHaveBeenCalledWith(
        createDto,
        mockUser().id,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return paginated accommodations', async () => {
      const query: GetAccommodationsDto = {
        page: 1,
        pageSize: 12,
        location: 'Belgrade',
      };

      const paginated: PaginatedResponse<AccommodationResponseDto> = {
        data: [
          mockAccommodationResponse(),
          mockAccommodationResponse({ id: 'acc_999', name: 'Second place' }),
        ],
        total: 47,
        page: 1,
        pageSize: 12,
      };

      mockAccommodationsService.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(query);

      expect(mockAccommodationsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginated);
    });
  });

  describe('findOne', () => {
    it('should return single accommodation', async () => {
      const expected = mockAccommodationResponse();
      mockAccommodationsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('acc_01JMOCKEDACCOM001');

      expect(mockAccommodationsService.findOne).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
      );
      expect(result).toEqual(expected);
    });

    it('should throw when accommodation not found', async () => {
      mockAccommodationsService.findOne.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return updated dto', async () => {
      const updateDto: UpdateAccommodationDto = {
        name: 'Renovated Luxury',
        basePrice: 150.0,
      };

      const updated = mockAccommodationResponse({ ...updateDto });
      mockAccommodationsService.update.mockResolvedValue(updated);

      const result = await controller.update(
        'acc_01JMOCKEDACCOM001',
        updateDto,
        mockUser(),
      );

      expect(mockAccommodationsService.update).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        updateDto,
        'test.host@example.com',
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call remove on service', async () => {
      mockAccommodationsService.remove.mockResolvedValue(undefined);

      await controller.remove('acc_01JMOCKEDACCOM001', mockUser());

      expect(mockAccommodationsService.remove).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        'test.host@example.com',
      );
    });
  });

  describe('uploadPhotos', () => {
    const mockFiles = [
      {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('...'),
      } as Express.Multer.File,
    ];

    it('should upload photos and return updated accommodation', async () => {
      const updated = mockAccommodationResponse({
        photoUrls: ['new-photo-1.jpg', 'new-photo-2.jpg'],
      });

      mockAccommodationsService.uploadPhotos.mockResolvedValue(updated);

      const result = await controller.uploadPhotos(
        'acc_01JMOCKEDACCOM001',
        mockFiles,
        mockUser(),
      );

      expect(mockAccommodationsService.uploadPhotos).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        mockFiles,
        'test.host@example.com',
      );
      expect(result).toEqual(updated);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //                           RULES
  // ────────────────────────────────────────────────────────────────

  describe('createRule', () => {
    it('should create rule and return RuleResponseDto', async () => {
      const createDto: CreateRuleDto = {
        startDate: new Date('2025-12-20'),
        endDate: new Date('2026-01-10'),
        overridePrice: 180,
        multiplier: 1.5,
        periodType: PeriodType.SEASONAL,
      };

      const expected: RuleResponseDto = mockRuleResponse({
        ...createDto,
        id: 'rule_new_123',
      });

      mockRulesService.createRule.mockResolvedValue(expected);

      const result = await controller.createRule(
        'acc_01JMOCKEDACCOM001',
        createDto,
        mockUser(),
      );

      expect(mockRulesService.createRule).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        expect.objectContaining(createDto),
        'test.host@example.com',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('updateRule', () => {
    it('should update rule and return updated RuleResponseDto', async () => {
      const updateDto: UpdateRuleDto = {
        multiplier: 1.75,
        overridePrice: 220,
      };

      const updated: RuleResponseDto = mockRuleResponse({
        ...updateDto,
        id: 'rule_01JMOCKRULE001',
      });

      mockRulesService.updateRule.mockResolvedValue(updated);

      const result = await controller.updateRule(
        'acc_01JMOCKEDACCOM001',
        'rule_01JMOCKRULE001',
        updateDto,
        mockUser(),
      );

      expect(mockRulesService.updateRule).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        'rule_01JMOCKRULE001',
        updateDto,
        'test.host@example.com',
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteRule', () => {
    it('should call deleteRule on service', async () => {
      mockRulesService.deleteRule.mockResolvedValue(undefined);

      await controller.deleteRule(
        'acc_01JMOCKEDACCOM001',
        'rule_01JMOCKRULE001',
        mockUser(),
      );

      expect(mockRulesService.deleteRule).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        'rule_01JMOCKRULE001',
        'test.host@example.com',
      );
    });
  });

  describe('getRules', () => {
    it('should return array of RuleResponseDto', async () => {
      const rules: RuleResponseDto[] = [
        mockRuleResponse({ id: 'r1', periodType: PeriodType.WEEKEND }),
        mockRuleResponse({
          id: 'r2',
          periodType: PeriodType.HOLIDAY,
          overridePrice: 250,
        }),
      ];

      mockRulesService.getRules.mockResolvedValue(rules);

      const result = await controller.getRules('acc_01JMOCKEDACCOM001');

      expect(mockRulesService.getRules).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
      );
      expect(result).toEqual(rules);
    });
  });
});
