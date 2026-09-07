import type { ForgeConfig } from '@sanskar22/core';
import type { GeneratedFile } from '../types.js';

export function generateQueueFiles(config: ForgeConfig, basePath: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { queue } = config;

  if (queue?.provider !== 'bullmq') {
    return files;
  }

  const queueTs = `import { Queue } from 'bullmq';
import { redis } from '../cache/redis.js';
import { logger } from '../observability/logger.js';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export const emailQueue = new Queue<EmailJobData>('email-notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
  },
});

logger.info('Initialized BullMQ Queue: email-notifications');
`;

  const workerTs = `import { Worker, Job } from 'bullmq';
import { redis } from '../cache/redis.js';
import { logger } from '../observability/logger.js';
import type { EmailJobData } from './queue.js';

export const emailWorker = new Worker<EmailJobData>(
  'email-notifications',
  async (job: Job<EmailJobData>) => {
    logger.info({ jobId: job.id, to: job.data.to }, 'Processing email job');
    // Simulate async job processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    logger.info({ jobId: job.id }, 'Successfully sent email');
    return { status: 'sent', timestamp: new Date().toISOString() };
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'BullMQ Job completed');
});

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'BullMQ Job failed');
});

export async function stopWorkers(): Promise<void> {
  logger.info('Stopping BullMQ workers...');
  await emailWorker.close();
}
`;

  files.push({
    path: `${basePath}/src/queues/queue.ts`,
    content: queueTs,
  });

  files.push({
    path: `${basePath}/src/queues/worker.ts`,
    content: workerTs,
  });

  return files;
}
