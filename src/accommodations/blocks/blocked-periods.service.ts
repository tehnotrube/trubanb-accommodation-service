import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedPeriod } from '../entities/blocked-period.entity';
import { ReservationCreatedEvent } from '../../events/reservations/reservation-created.event';

@Injectable()
export class BlockedPeriodsService {
  constructor(
    @InjectRepository(BlockedPeriod)
    private readonly blockedPeriodRepository: Repository<BlockedPeriod>,
  ) {}

  async createReservationBlock(event: ReservationCreatedEvent): Promise<void> {
    const exists = await this.blockedPeriodRepository.findOne({
      where: { reservationId: event.reservationId },
    });

    if (exists) return;

    const block = this.blockedPeriodRepository.create({
      accommodationId: event.accommodationId,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      reason: event.reason,
      reservationId: event.reservationId,
    });

    await this.blockedPeriodRepository.save(block);
  }

  async removeReservationBlock(reservationId: string): Promise<void> {
    await this.blockedPeriodRepository.delete({
      reservationId
    });
  }
}
