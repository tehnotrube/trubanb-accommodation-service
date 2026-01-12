import { Module, Global } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    MetricsMiddleware,
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),
    makeGaugeProvider({
      name: 'unique_visitors_total',
      help: 'Number of unique visitors (IP + User-Agent)',
    }),
    makeCounterProvider({
      name: 'http_404_errors_total',
      help: 'Total number of 404 errors',
      labelNames: ['endpoint'],
    }),
    makeCounterProvider({
      name: 'http_request_size_bytes',
      help: 'Total HTTP request size in bytes',
      labelNames: ['method', 'route'],
    }),
    makeCounterProvider({
      name: 'http_response_size_bytes',
      help: 'Total HTTP response size in bytes',
      labelNames: ['method', 'route'],
    }),
  ],
  exports: [PrometheusModule, MetricsService, MetricsMiddleware],
})
export class MetricsModule {}
