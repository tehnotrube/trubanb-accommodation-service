import { Test, TestingModule } from '@nestjs/testing';
import { ReservationEventsController } from './reservation-events.controller';
import { BlockedPeriodsService } from '../../accommodations/blocks/blocked-periods.service';
import { ReservationCreatedEvent } from './reservation-created.event';

describe('ReservationEventsController', () => {
  let controller: ReservationEventsController;
  let blockedPeriodsService: jest.Mocked<BlockedPeriodsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationEventsController],
      providers: [
        {
          provide: BlockedPeriodsService,
          useValue: {
            createReservationBlock: jest.fn(),
            removeReservationBlock: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReservationEventsController>(
      ReservationEventsController,
    );
    blockedPeriodsService = module.get(BlockedPeriodsService);
  });

  describe('handleReservationCreated', () => {
    it('should call createReservationBlock with the event data', async () => {
      const mockEvent: ReservationCreatedEvent = {
        reservationId: 'res-123',
        accommodationId: 'acc-456',
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        reason: 'RESERVATION',
      };

      await controller.handleReservationCreated(mockEvent);

      expect(blockedPeriodsService.createReservationBlock).toHaveBeenCalledWith(
        mockEvent,
      );
      expect(
        blockedPeriodsService.createReservationBlock,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleReservationRemoved', () => {
    it('should call removeReservationBlock with the reservationId', async () => {
      const mockEvent = { reservationId: 'res-123' };

      await controller.handleReservationRemoved(mockEvent);

      expect(blockedPeriodsService.removeReservationBlock).toHaveBeenCalledWith(
        'res-123',
      );
      expect(
        blockedPeriodsService.removeReservationBlock,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
