import { Module } from '@nestjs/common';
import { AccommodationsService } from './accommodations.service';
import { AccommodationsController } from './accommodations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accommodation } from './entities/accommodation.entity';
import { StorageModule } from '../storage/storage.module';
import { AccommodationRule } from './entities/accommodation-rule.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Accommodation, AccommodationRule, BlockedPeriod]),
    StorageModule,
  ],
  controllers: [AccommodationsController],
  providers: [AccommodationsService],
})
export class AccommodationsModule {}
