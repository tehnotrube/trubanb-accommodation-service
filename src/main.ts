// Import tracing FIRST - before any other imports
import './tracing';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MetricsMiddleware } from './metrics';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the middleware instance from the DI container and apply it globally
  const metricsMiddleware = app.get(MetricsMiddleware);
  app.use(metricsMiddleware.use.bind(metricsMiddleware));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
