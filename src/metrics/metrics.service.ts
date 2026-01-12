import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
    @InjectMetric('unique_visitors_total')
    private readonly uniqueVisitors: Gauge<string>,
    @InjectMetric('http_404_errors_total')
    private readonly http404Errors: Counter<string>,
    @InjectMetric('http_request_size_bytes')
    private readonly httpRequestSizeBytes: Counter<string>,
    @InjectMetric('http_response_size_bytes')
    private readonly httpResponseSizeBytes: Counter<string>,
  ) {}

  incrementRequests(method: string, route: string, statusCode: string): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
  }

  observeDuration(
    method: string,
    route: string,
    statusCode: string,
    durationSeconds: number,
  ): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      durationSeconds,
    );
  }

  setUniqueVisitors(count: number): void {
    this.uniqueVisitors.set(count);
  }

  increment404Error(endpoint: string): void {
    this.http404Errors.inc({ endpoint });
  }

  incrementRequestSize(method: string, route: string, bytes: number): void {
    this.httpRequestSizeBytes.inc({ method, route }, bytes);
  }

  incrementResponseSize(method: string, route: string, bytes: number): void {
    this.httpResponseSizeBytes.inc({ method, route }, bytes);
  }
}
