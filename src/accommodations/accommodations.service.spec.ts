import { Test, TestingModule } from '@nestjs/testing';
import { AccommodationsService } from './accommodations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Accommodation } from './entities/accommodation.entity';

const mockAccommodation = {
  id: 1,
  name: 'Test Hotel',
  location: 'Test City',
  price: 100,
};

describe('AccommodationsService', () => {
  let service: AccommodationsService;

  const mockRepository = {
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccommodationsService,
        {
          provide: getRepositoryToken(Accommodation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AccommodationsService>(AccommodationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return paginated accommodations', async () => {
    mockRepository.findAndCount.mockResolvedValue([[mockAccommodation], 1]);

    const result = await service.findAll({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      data: [mockAccommodation],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    expect(mockRepository.findAndCount).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
    });
  });
});
