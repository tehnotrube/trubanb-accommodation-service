import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { AccommodationsService } from './accommodations.service';
import { Accommodation } from './entities/accommodation.entity';
import { StorageService } from '../storage/storage.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';

const createMockQueryBuilder = <
  T extends ObjectLiteral = Accommodation,
>(): jest.Mocked<SelectQueryBuilder<T>> => {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  } as unknown as jest.Mocked<SelectQueryBuilder<T>>;
};

describe('AccommodationsService', () => {
  let service: AccommodationsService;
  let accommodationRepo: jest.Mocked<Repository<Accommodation>>;
  let storageService: jest.Mocked<StorageService>;

  const mockEntity = (partial: Partial<Accommodation> = {}): Accommodation =>
    ({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Apartment',
      location: 'Test City',
      basePrice: 99.99,
      minGuests: 1,
      maxGuests: 4,
      hostId: 'host-123',
      amenities: ['wifi', 'kitchen'],
      photoKeys: ['photos/123/1.jpg', 'photos/123/2.jpg'],
      autoApprove: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      accommodationRules: [],
      blockedPeriods: [],
      isPerUnit: true,
      ...partial,
    }) as Accommodation;

  const mockPublicUrls = ['https://cdn/1.jpg', 'https://cdn/2.jpg'];

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
            createQueryBuilder: jest.fn(),
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
    storageService = module.get(StorageService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create and return dto', async () => {
      const dto = {
        name: 'New Place',
        location: 'New City',
        basePrice: 120,
        minGuests: 2,
        maxGuests: 5,
      };

      const createdEntity = mockEntity({ ...dto, photoKeys: [] });
      const savedEntity = { ...createdEntity, id: 'new-id' };

      accommodationRepo.create.mockReturnValue(createdEntity);
      accommodationRepo.save.mockResolvedValue(savedEntity);
      storageService.getPublicUrls.mockReturnValue([]);

      const result = await service.create(dto, 'host-123');

      expect(accommodationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining(dto),
      );
      expect(accommodationRepo.save).toHaveBeenCalledWith(createdEntity);
      expect(result.id).toBe('new-id');
      expect(result.photoUrls).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return paginated dtos without filters', async () => {
      const entities = [
        mockEntity({ id: '1', name: 'A', basePrice: 100 }),
        mockEntity({ id: '2', name: 'B', basePrice: 150 }),
      ];

      const qb = createMockQueryBuilder<Accommodation>();
      qb.getManyAndCount.mockResolvedValue([entities, 2]);

      accommodationRepo.createQueryBuilder.mockReturnValue(qb);

      storageService.getPublicUrls
        .mockReturnValueOnce(mockPublicUrls)
        .mockReturnValueOnce(mockPublicUrls);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);

      expect(accommodationRepo.createQueryBuilder).toHaveBeenCalledWith('acc');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(qb.getManyAndCount).toHaveBeenCalled();
    });

    it('should apply location filter when provided', async () => {
      const qb = createMockQueryBuilder<Accommodation>();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      accommodationRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, pageSize: 10, location: 'Paris' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(acc.location) LIKE LOWER(:location)'),
        expect.objectContaining({ location: '%Paris%' }), // ← fixed: capital P
      );
    });

    it('should apply guests filter when provided', async () => {
      const qb = createMockQueryBuilder<Accommodation>();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      accommodationRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, pageSize: 10, guests: 3 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        ':guests BETWEEN acc.minGuests AND acc.maxGuests',
        { guests: 3 },
      );
    });

    it('should filter by availability and calculate prices when dates are provided', async () => {
      const entity = mockEntity({
        id: '1',
        basePrice: 100,
        isPerUnit: true,
        minGuests: 1,
        maxGuests: 4,
        accommodationRules: [],
        blockedPeriods: [],
        photoKeys: [],
      });

      const qb = createMockQueryBuilder<Accommodation>();
      qb.getManyAndCount.mockResolvedValue([[entity], 1]);

      accommodationRepo.createQueryBuilder.mockReturnValue(qb);

      storageService.getPublicUrls.mockReturnValue(['photo.jpg']);

      const query: GetAccommodationsDto = {
        page: 1,
        pageSize: 10,
        checkIn: '2026-03-10',
        checkOut: '2026-03-15',
        guests: 2,
      };

      const result = await service.findAll(query);

      expect(result.data[0].totalPriceForStay).toBe(500);
      expect(result.data[0].pricePerNight).toBe(100);
      expect(result.data[0].appliedRulesCount).toBe(0);
    });

    it('should throw BadRequestException when checkOut is before checkIn', async () => {
      const qb = createMockQueryBuilder<Accommodation>();
      qb.getManyAndCount.mockResolvedValue([[], 1]);

      accommodationRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.findAll({
          page: 1,
          pageSize: 10,
          checkIn: '2026-03-15',
          checkOut: '2026-03-10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on invalid date format', async () => {
      const qb = createMockQueryBuilder<Accommodation>();
      qb.getManyAndCount.mockResolvedValue([[], 1]);

      accommodationRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.findAll({
          page: 1,
          pageSize: 10,
          checkIn: 'invalid-date',
          checkOut: '2026-03-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return dto when found', async () => {
      const entity = mockEntity();
      accommodationRepo.findOneBy.mockResolvedValue(entity);
      storageService.getPublicUrls.mockReturnValue(mockPublicUrls);

      const result = await service.findOne(entity.id);

      expect(result.photoUrls).toEqual(mockPublicUrls);
      expect(result.id).toBe(entity.id);
    });

    it('should throw NotFound when not exists', async () => {
      accommodationRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('wrong-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update entity and return dto', async () => {
      const entity = mockEntity();
      const updateDto = { name: 'Updated Name', basePrice: 150 };

      accommodationRepo.findOneBy.mockResolvedValue(entity);
      accommodationRepo.save.mockResolvedValue({ ...entity, ...updateDto });
      storageService.getPublicUrls.mockReturnValue(mockPublicUrls);

      const result = await service.update(entity.id, updateDto, 'host-123');

      expect(result.name).toBe('Updated Name');
      expect(result.basePrice).toBe(150);
    });
  });

  describe('remove', () => {
    it('should remove entity and delete photos if exist', async () => {
      const entity = mockEntity();
      accommodationRepo.findOneBy.mockResolvedValue(entity);

      await service.remove(entity.id, 'host-123');

      expect(storageService.deleteFiles).toHaveBeenCalledWith(entity.photoKeys);
      expect(accommodationRepo.remove).toHaveBeenCalledWith(entity);
    });

    it('should not call deleteFiles when no photos', async () => {
      const entity = mockEntity({ photoKeys: [] });
      accommodationRepo.findOneBy.mockResolvedValue(entity);

      await service.remove(entity.id, 'host-123');

      expect(storageService.deleteFiles).not.toHaveBeenCalled();
    });
  });

  describe('uploadPhotos', () => {
    it('should upload and append new keys', async () => {
      const entity = mockEntity();
      const newKeys = ['new/photo1.jpg', 'new/photo2.jpg'];
      const files = [{}, {}] as Express.Multer.File[];

      accommodationRepo.findOneBy.mockResolvedValue(entity);
      storageService.uploadFiles.mockResolvedValue(newKeys);
      accommodationRepo.save.mockResolvedValue({
        ...entity,
        photoKeys: [...entity.photoKeys, ...newKeys],
      });
      storageService.getPublicUrls.mockReturnValue([
        ...mockPublicUrls,
        'new1.jpg',
        'new2.jpg',
      ]);

      const result = await service.uploadPhotos('123', files, 'host-123');

      expect(storageService.uploadFiles).toHaveBeenCalledWith(files, '123');
      expect(result.photoUrls?.length).toBe(4);
    });
  });
});
