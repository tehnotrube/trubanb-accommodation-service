import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private visitors = new Set<string>();

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
  ) {
    setInterval(() => this.visitors.clear(), 60 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/metrics') {
      return next();
    }

    const startTime = Date.now();
    const method = req.method;

    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = this.getClientIp(req);
    const today = new Date().toISOString().split('T')[0];
    const visitorKey = `${clientIp}-${userAgent}-${today}`;
    this.visitors.add(visitorKey);
    this.uniqueVisitors.set(this.visitors.size);

    const requestSize = parseInt(req.headers['content-length'] || '0', 10);

    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode.toString();
      const route = this.normalizeRoute(req.path);

      this.httpRequestsTotal.inc({ method, route, status_code: statusCode });

      this.httpRequestDuration.observe(
        { method, route, status_code: statusCode },
        duration,
      );

      if (res.statusCode === 404) {
        this.http404Errors.inc({ endpoint: route });
      }

      if (requestSize > 0) {
        this.httpRequestSizeBytes.inc({ method, route }, requestSize);
      }

      const responseSize = parseInt(res.get('content-length') || '0', 10);
      if (responseSize > 0) {
        this.httpResponseSizeBytes.inc({ method, route }, responseSize);
      }
    });

    next();
  }

  private normalizeRoute(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid');
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
