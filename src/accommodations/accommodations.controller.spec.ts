import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';
import { AccommodationResponseDto } from './dto/accommodation.response.dto';
import { PaginatedResponse } from '../common/types/PaginatedResponse';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { CreateManualBlockDto } from './dto/create-manual-block.dto';
import { RuleResponseDto } from './dto/rule.response.dto';
import { BlockResponseDto } from './dto/block.response.dto';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../auth/guards/roles.guard';
import { PeriodType } from './entities/accommodation-rule.entity';

describe('AccommodationsController', () => {
  let controller: AccommodationsController;
  let mockService: jest.Mocked<AccommodationsService>;

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
    ...overrides,
  });

  const mockRuleResponse = (
    overrides: Partial<RuleResponseDto> = {},
  ): RuleResponseDto => ({
    id: 'rule_01JMOCKRULE001',
    startDate: new Date('2025-12-20'),
    endDate: new Date('2026-01-10'),
    multiplier: 1.35,
    periodType: 'SEASONAL',
    minStayDays: 4,
    maxStayDays: 14,
    ...overrides,
  });

  const mockBlockResponse = (
    overrides: Partial<BlockResponseDto> = {},
  ): BlockResponseDto => ({
    id: 'blk_01JMOCKBLOCK001',
    startDate: new Date('2025-11-10'),
    endDate: new Date('2025-11-15'),
    reason: 'MANUAL',
    notes: 'Host private use',
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
            createRule: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            getRules: jest.fn(),
            createManualBlock: jest.fn(),
            deleteManualBlock: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AccommodationsController);
    mockService = module.get(AccommodationsService);
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
        hostId: 'hst_01JMOCKEDHOST001',
        amenities: ['WiFi'],
        autoApprove: false,
        isPerUnit: false,
      };

      const expected = mockAccommodationResponse({
        name: createDto.name,
        basePrice: createDto.basePrice,
      });
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(createDto);

      expect(mockService.create).toHaveBeenCalledWith(createDto);
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

      mockService.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginated);
    });
  });

  describe('findOne', () => {
    it('should return single accommodation', async () => {
      const expected = mockAccommodationResponse();
      mockService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('acc_01JMOCKEDACCOM001');

      expect(mockService.findOne).toHaveBeenCalledWith('acc_01JMOCKEDACCOM001');
      expect(result).toEqual(expected);
    });

    it('should throw when accommodation not found', async () => {
      mockService.findOne.mockRejectedValue(new NotFoundException());

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
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(
        'acc_01JMOCKEDACCOM001',
        updateDto,
      );

      expect(mockService.update).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        updateDto,
      );
      expect(result).toEqual(updated);
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

      mockService.uploadPhotos.mockResolvedValue(updated);

      const result = await controller.uploadPhotos(
        'acc_01JMOCKEDACCOM001',
        mockFiles,
        mockUser(),
      );

      expect(mockService.uploadPhotos).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        mockFiles,
        mockUser().email,
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
        minStayDays: 5,
        maxStayDays: 21,
      };

      const expected: RuleResponseDto = mockRuleResponse({
        ...createDto,
        id: 'rule_new_123',
      });

      mockService.createRule.mockResolvedValue(expected);

      const result = await controller.createRule(
        'acc_01JMOCKEDACCOM001',
        createDto,
        mockUser(),
      );

      expect(mockService.createRule).toHaveBeenCalledWith(
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

      mockService.updateRule.mockResolvedValue(updated);

      const result = await controller.updateRule(
        'acc_01JMOCKEDACCOM001',
        'rule_01JMOCKRULE001',
        updateDto,
        mockUser(),
      );

      expect(mockService.updateRule).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        'rule_01JMOCKRULE001',
        updateDto,
        'test.host@example.com',
      );
      expect(result).toEqual(updated);
    });
  });

  describe('getRules', () => {
    it('should return array of RuleResponseDto', async () => {
      const rules: RuleResponseDto[] = [
        mockRuleResponse({ id: 'r1', periodType: 'WEEKEND' }),
        mockRuleResponse({
          id: 'r2',
          periodType: 'HOLIDAY',
          overridePrice: 250,
        }),
      ];

      mockService.getRules.mockResolvedValue(rules);

      const result = await controller.getRules('acc_01JMOCKEDACCOM001');

      expect(mockService.getRules).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
      );
      expect(result).toEqual(rules);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //                        MANUAL BLOCKS
  // ────────────────────────────────────────────────────────────────

  describe('createManualBlock', () => {
    it('should create manual block and return BlockResponseDto', async () => {
      const createDto: CreateManualBlockDto = {
        startDate: new Date('2025-11-20'),
        endDate: new Date('2025-11-27'),
        notes: 'Owner staying',
      };

      const expected: BlockResponseDto = mockBlockResponse({
        ...createDto,
        id: 'blk_new_777',
      });

      mockService.createManualBlock.mockResolvedValue(expected);

      const result = await controller.createManualBlock(
        'acc_01JMOCKEDACCOM001',
        createDto,
        mockUser(),
      );

      expect(mockService.createManualBlock).toHaveBeenCalledWith(
        'acc_01JMOCKEDACCOM001',
        createDto,
        'test.host@example.com',
      );
      expect(result).toEqual(expected);
    });
  });
});
