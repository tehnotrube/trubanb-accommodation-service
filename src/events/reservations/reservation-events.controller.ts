import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Controller, Logger } from '@nestjs/common';
import { ReservationCreatedEvent } from './reservation-created.event';
import { BlockedPeriodsService } from '../../accommodations/blocks/blocked-periods.service';

@Controller()
export class ReservationEventsController {
  private readonly logger = new Logger(ReservationEventsController.name);

  constructor(private readonly blockedPeriodsService: BlockedPeriodsService) {}

  @RabbitSubscribe({
    exchange: 'reservation.events',
    routingKey: 'reservation.created',
    queue: 'accommodation.reservation.queue',
  })
  async handleReservationCreated(event: ReservationCreatedEvent) {
    this.logger.log(`Received: ${event.reservationId}`);
    await this.blockedPeriodsService.createReservationBlock(event);
  }

  @RabbitSubscribe({
    exchange: 'reservation.events',
    routingKey: 'reservation.removed',
    queue: 'accommodation.reservation.removal-queue',
  })
  async handleReservationRemoved(event: { reservationId: string }) {
    await this.blockedPeriodsService.removeReservationBlock(
      event.reservationId,
    );
  }
}
