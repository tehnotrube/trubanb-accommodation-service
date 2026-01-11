import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccommodationsModule } from './accommodations/accommodations.module';
import { MetricsModule } from './metrics';
import { getTypeOrmConfig } from './db/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => {
        return getTypeOrmConfig({
          isTest: process.env.NODE_ENV === 'test' || process.env.ENV === 'test',
        });
      },
    }),
    AccommodationsModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
