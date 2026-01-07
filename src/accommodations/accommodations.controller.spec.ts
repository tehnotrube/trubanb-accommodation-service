import { Test, TestingModule } from '@nestjs/testing';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';

const mockAccommodation = {
  id: 1,
  name: 'Test Hotel',
  location: 'Test City',
  price: 100,
};

describe('AccommodationsController', () => {
  let controller: AccommodationsController;

  const mockService = {
    findAll: jest.fn().mockResolvedValue({
      data: [mockAccommodation],
      total: 1,
      page: 1,
      pageSize: 10,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccommodationsController],
      providers: [{ provide: AccommodationsService, useValue: mockService }],
    }).compile();

    controller = module.get<AccommodationsController>(AccommodationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return paginated accommodations', async () => {
    const result = await controller.findAll({ page: 1, pageSize: 10 });
    expect(result.data[0].name).toBe('Test Hotel');
  });
});
