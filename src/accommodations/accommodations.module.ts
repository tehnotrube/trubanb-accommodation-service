import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsGrpcController } from './accommodations.grpc.controller';
import { AccommodationsService } from './accommodations.service';
import { BlockedPeriodsService } from './blocks/blocked-periods.service';
import { Accommodation } from './entities/accommodation.entity';
import { AccommodationRule } from './entities/accommodation-rule.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';
import { StorageService } from '../storage/storage.service';
import { AccommodationRulesService } from './rules/accommodation-rules.service';
import { ReservationEventsController } from '../events/reservations/reservation-events.controller';
import { UserEventsController } from 'src/events/users/user-events.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Accommodation, AccommodationRule, BlockedPeriod]),
  ],
  controllers: [
    ReservationEventsController,
    UserEventsController,
    AccommodationsController,
    AccommodationsGrpcController,
  ],
  providers: [
    AccommodationsService,
    AccommodationRulesService,
    BlockedPeriodsService,
    StorageService,
  ],
  exports: [
    AccommodationsService,
    AccommodationRulesService,
    BlockedPeriodsService,
  ],
})
export class AccommodationsModule {}
