import { Controller, Get } from '@nestjs/common';

@Controller('api/accommodations/health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'accommodation-service',
      timestamp: new Date().toISOString(),
    };
  }
}
