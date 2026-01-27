import './tracing';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { MetricsMiddleware } from './metrics/metrics.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const metricsMiddleware = app.get(MetricsMiddleware);
  app.use(metricsMiddleware.use.bind(metricsMiddleware));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'accommodation',
      protoPath: join(__dirname, 'proto/accommodation.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT ?? 50051}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
