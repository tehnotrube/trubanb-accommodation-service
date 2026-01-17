import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { BlockedPeriodsService } from './blocks/blocked-periods.service';
import { Accommodation } from './entities/accommodation.entity';
import { AccommodationRule } from './entities/accommodation-rule.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';
import { StorageService } from '../storage/storage.service';
import { AccommodationRulesService } from './rules/accommodation-rules.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Accommodation, AccommodationRule, BlockedPeriod]),
  ],
  controllers: [AccommodationsController],
  providers: [
    AccommodationsService,
    AccommodationRulesService,
    BlockedPeriodsService,
    StorageService,
    AccommodationRulesService,
  ],
  exports: [
    AccommodationsService,
    AccommodationRulesService,
    BlockedPeriodsService,
  ],
})
export class AccommodationsModule {}
