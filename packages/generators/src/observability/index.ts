import type { ForgeConfig } from '@forgestack/core';
import type { GeneratedFile } from '../types.js';

export function generateObservabilityFiles(config: ForgeConfig, basePath: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { observability } = config;

  if (!observability || observability.logging === 'none') {
    return files;
  }

  // 1. Logger (Pino)
  const loggerContent = `import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
`;
  files.push({
    path: `${basePath}/src/observability/logger.ts`,
    content: loggerContent,
  });

  // 2. Metrics (Prometheus)
  if (observability.metrics === 'prometheus') {
    const metricsContent = `import client from 'prom-client';

// Enable default runtime and system metrics collection
client.collectDefaultMetrics({ prefix: '${config.project.name.replace(/[^a-zA-Z0-9_]/g, '_')}_' });

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
});

export async function getMetrics(): Promise<string> {
  return client.register.metrics();
}

export function getContentType(): string {
  return client.register.contentType;
}
`;
    files.push({
      path: `${basePath}/src/observability/metrics.ts`,
      content: metricsContent,
    });
  }

  // 3. Tracing (OpenTelemetry)
  if (observability.tracing === 'opentelemetry') {
    const tracingContent = `import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from './logger.js';

export const sdk = new NodeSDK({
  serviceName: '${config.project.name}-api',
  instrumentations: [getNodeAutoInstrumentations()],
});

export function startTracing(): void {
  try {
    sdk.start();
    logger.info('OpenTelemetry SDK initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize OpenTelemetry SDK');
  }
}

export async function shutdownTracing(): Promise<void> {
  try {
    await sdk.shutdown();
    logger.info('OpenTelemetry SDK shut down successfully');
  } catch (err) {
    logger.error({ err }, 'Error during OpenTelemetry SDK shutdown');
  }
}
`;
    files.push({
      path: `${basePath}/src/observability/tracing.ts`,
      content: tracingContent,
    });
  }

  return files;
}
