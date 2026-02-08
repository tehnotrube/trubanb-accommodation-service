import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccommodationsModule } from './accommodations/accommodations.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { getTypeOrmConfig } from './db/typeorm.config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RabbitMQModule.forRoot({
      exchanges: [{ name: 'reservation.events', type: 'topic' },
    {
      name: 'user.events',
      type: 'topic',
    },],
      uri: process.env.RABBITMQ_URL!,
      connectionInitOptions: { wait: true },
      enableControllerDiscovery: true,
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
