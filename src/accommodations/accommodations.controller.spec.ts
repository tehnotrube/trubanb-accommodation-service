import { Test, TestingModule } from '@nestjs/testing';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';
import { AccommodationResponseDto } from './dto/accommodation.response.dto';
import { PaginatedResponse } from 'src/common/types/PaginatedResponse';

describe('AccommodationsController', () => {
  let controller: AccommodationsController;
  let mockService: jest.Mocked<AccommodationsService>;

  const mockResponseDto = (
    partial: Partial<AccommodationResponseDto> = {},
  ): AccommodationResponseDto =>
    ({
      id: 'accom_01J123abcDEF',
      name: 'Cozy Apartment Belgrade',
      location: 'Belgrade',
      basePrice: 89.99,
      minGuests: 2,
      maxGuests: 6,
      hostId: 'host_01J456xyz789',
      amenities: ['WiFi', 'Kitchen'],
      photoUrls: ['https://cdn.example.com/1.jpg'],
      autoApprove: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      ...partial,
    }) as AccommodationResponseDto;

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
            deletePhoto: jest.fn(),
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
    it('should call service and return dto', async () => {
      const inputDto: CreateAccommodationDto = {
        name: 'Test Place',
        location: 'Test City',
        basePrice: 99.99,
        minGuests: 1,
        maxGuests: 4,
        hostId: 'host123',
      };

      const expectedDto = mockResponseDto({
        name: inputDto.name,
        location: inputDto.location,
      });

      mockService.create.mockResolvedValue(expectedDto);

      const result = await controller.create(inputDto);

      expect(mockService.create).toHaveBeenCalledWith(inputDto);
      expect(result).toEqual(expectedDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated response', async () => {
      const query: GetAccommodationsDto = { page: 2, pageSize: 15 };

      const paginated: PaginatedResponse<AccommodationResponseDto> = {
        data: [mockResponseDto(), mockResponseDto({ id: 'second' })],
        total: 47,
        page: 2,
        pageSize: 15,
      };

      mockService.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(paginated);
    });
  });

  describe('findOne', () => {
    it('should return single dto', async () => {
      const expected = mockResponseDto();
      mockService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('accom_01J123abcDEF');

      expect(mockService.findOne).toHaveBeenCalledWith('accom_01J123abcDEF');
      expect(result).toBe(expected);
    });
  });

  describe('update', () => {
    it('should update and return updated dto', async () => {
      const updateDto: UpdateAccommodationDto = {
        name: 'New Amazing Name',
        basePrice: 199.99,
      };

      const updatedDto = mockResponseDto({
        name: updateDto.name,
        basePrice: updateDto.basePrice,
      });

      mockService.update.mockResolvedValue(updatedDto);

      const result = await controller.update('accom_01J123abcDEF', updateDto);

      expect(mockService.update).toHaveBeenCalledWith(
        'accom_01J123abcDEF',
        updateDto,
      );
      expect(result).toEqual(updatedDto);
    });
  });

  describe('remove', () => {
    it('should call service remove', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await expect(
        controller.remove('accom_01J123abcDEF'),
      ).resolves.toBeUndefined();

      expect(mockService.remove).toHaveBeenCalledWith('accom_01J123abcDEF');
    });
  });

  describe('uploadPhotos', () => {
    it('should forward files and return updated dto', async () => {
      const mockFiles = [
        {
          originalname: 'test1.jpg',
          buffer: Buffer.from('fake'),
        } as Express.Multer.File,
        {
          originalname: 'test2.png',
          buffer: Buffer.from('fake2'),
        } as Express.Multer.File,
      ];

      const updatedDto = mockResponseDto({
        photoUrls: ['url1.jpg', 'url2.png', 'url3.webp'],
      });

      mockService.uploadPhotos.mockResolvedValue(updatedDto);

      const result = await controller.uploadPhotos('accom_xxx', mockFiles);

      expect(mockService.uploadPhotos).toHaveBeenCalledWith(
        'accom_xxx',
        mockFiles,
      );
      expect(result).toBe(updatedDto);
    });
  });
});
