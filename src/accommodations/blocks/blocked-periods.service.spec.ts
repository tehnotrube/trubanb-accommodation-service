import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { BlockedPeriodsService } from './blocked-periods.service';
import { BlockedPeriod } from '../entities/blocked-period.entity';
import { ReservationCreatedEvent } from '../../events/reservations/reservation-created.event';

describe('BlockedPeriodsService', () => {
  let service: BlockedPeriodsService;
  let blockedRepo: Repository<BlockedPeriod>;

  const mockEvent: ReservationCreatedEvent = {
    reservationId: 'res_123',
    accommodationId: 'acc_456',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    reason: 'RESERVATION',
  };

  const mockEntity = (data: Partial<BlockedPeriod>): BlockedPeriod =>
    data as BlockedPeriod;

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
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(BlockedPeriodsService);
    blockedRepo = module.get<Repository<BlockedPeriod>>(
      getRepositoryToken(BlockedPeriod),
    );
  });

  describe('createReservationBlock', () => {
    it('should create and save a new block if it does not exist', async () => {
      jest.spyOn(blockedRepo, 'findOne').mockResolvedValue(null);

      const createdBlock = mockEntity({
        ...mockEvent,
        startDate: new Date(mockEvent.startDate),
        endDate: new Date(mockEvent.endDate),
      });
      jest.spyOn(blockedRepo, 'create').mockReturnValue(createdBlock);
      jest.spyOn(blockedRepo, 'save').mockResolvedValue(createdBlock);

      await service.createReservationBlock(mockEvent);

      expect(blockedRepo.findOne).toHaveBeenCalledWith({
        where: { reservationId: mockEvent.reservationId },
      });
      expect(blockedRepo.save).toHaveBeenCalledWith(createdBlock);
    });

    it('should skip creation if block exists', async () => {
      jest
        .spyOn(blockedRepo, 'findOne')
        .mockResolvedValue(mockEntity({ id: 'exists' }));

      await service.createReservationBlock(mockEvent);

      expect(blockedRepo.create).not.toHaveBeenCalled();
      expect(blockedRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('removeReservationBlock', () => {
    it('should call delete with correct criteria', async () => {
      const resId = 'res_123';
      const mockDeleteResult: DeleteResult = { raw: [], affected: 1 };

      jest.spyOn(blockedRepo, 'delete').mockResolvedValue(mockDeleteResult);

      await service.removeReservationBlock(resId);

      expect(blockedRepo.delete).toHaveBeenCalledWith({
        reservationId: resId,
      });
    });
  });
});
