import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccommodationsService } from './accommodations.service';
import { Accommodation } from './entities/accommodation.entity';
import { StorageService } from '../storage/storage.service';
import { NotFoundException } from '@nestjs/common';

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
          },
        },
        {
          provide: StorageService,
          useValue: {
            getPublicUrls: jest.fn(),
            uploadFiles: jest.fn(),
            deleteFile: jest.fn(),
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
        hostId: 'host-new',
      };

      const createdEntity = mockEntity({ ...dto, photoKeys: [] });
      const savedEntity = { ...createdEntity, id: 'new-id' };

      accommodationRepo.create.mockReturnValue(createdEntity);
      accommodationRepo.save.mockResolvedValue(savedEntity);
      storageService.getPublicUrls.mockReturnValue([]);

      const result = await service.create(dto);

      expect(accommodationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining(dto),
      );
      expect(accommodationRepo.save).toHaveBeenCalledWith(createdEntity);
      expect(result.id).toBe('new-id');
      expect(result.photoUrls).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return paginated dtos', async () => {
      const entities = [mockEntity(), mockEntity({ id: 'second' })];
      accommodationRepo.findAndCount.mockResolvedValue([entities, 2]);
      storageService.getPublicUrls.mockReturnValue(mockPublicUrls);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].photoUrls).toEqual(mockPublicUrls);
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

      const result = await service.update(entity.id, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(result.basePrice).toBe(150);
    });
  });

  describe('remove', () => {
    it('should remove entity and delete photos if exist', async () => {
      const entity = mockEntity();
      accommodationRepo.findOneBy.mockResolvedValue(entity);

      await service.remove(entity.id);

      expect(storageService.deleteFiles).toHaveBeenCalledWith(entity.photoKeys);
      expect(accommodationRepo.remove).toHaveBeenCalledWith(entity);
    });

    it('should not call deleteFiles when no photos', async () => {
      const entity = mockEntity({ photoKeys: [] });
      accommodationRepo.findOneBy.mockResolvedValue(entity);

      await service.remove(entity.id);

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
        'new1',
        'new2',
      ]);

      const result = await service.uploadPhotos('123', files);

      expect(storageService.uploadFiles).toHaveBeenCalledWith(files, '123');
      expect(result.photoUrls?.length).toBe(4);
    });
  });
});
