import { promises as fs } from 'node:fs';
import path from 'node:path';
import { validateForgeConfig, type ForgeConfig } from '@sanskar22/core';
import {
  renderSharedTypesPackage,
  renderSharedConfigPackage,
  renderWorkerApp,
} from '@sanskar22/templates';
import type { GeneratedFile } from './types.js';
import { generateBackendFiles } from './backend/index.js';
import { generateFrontendFiles } from './frontend/index.js';
import { generateDatabaseFiles } from './database/index.js';
import { generateCacheFiles } from './cache/index.js';
import { generateQueueFiles } from './queues/index.js';
import { generateObservabilityFiles } from './observability/index.js';
import { generateDockerFiles } from './docker/index.js';
import { generateTerraformFiles } from './terraform/index.js';
import { generateKubernetesFiles } from './kubernetes/index.js';
import { generateCicdFiles } from './cicd/index.js';
import { generateDocsAndConfigs } from './docs/index.js';

export async function orchestrateProjectGeneration(config: ForgeConfig): Promise<GeneratedFile[]> {
  const validation = validateForgeConfig(config);
  if (!validation.valid) {
    const errMessages = validation.errors.map((e) => `[${e.code}] ${e.message}`).join('\n');
    throw new Error(`Invalid architecture configuration:\n${errMessages}`);
  }

  const files: GeneratedFile[] = [];
  const isFullstack = config.project.type === 'fullstack';
  const isBackend = config.project.type === 'backend';
  const isFrontend = config.project.type === 'frontend';
  const isInfra = config.project.type === 'infrastructure';

  const backendBase = isFullstack ? 'apps/api' : '.';
  const frontendBase = isFullstack ? 'apps/web' : '.';

  // 1. Rich Monorepo structure for Full-Stack (pnpm + Turborepo)
  if (isFullstack) {
    const rootPkg = {
      name: config.project.name,
      version: '0.1.0',
      private: true,
      packageManager: 'pnpm@9.15.5',
      scripts: {
        build: 'turbo run build',
        dev: 'turbo run dev',
        test: 'turbo run test',
        lint: 'turbo run lint',
        clean: 'turbo run clean',
      },
      devDependencies: {
        turbo: '^2.4.4',
        typescript: '^5.7.3',
        rimraf: '^6.0.1',
      },
    };

    files.push({
      path: 'package.json',
      content: JSON.stringify(rootPkg, null, 2),
    });

    const pnpmWorkspace = `packages:
  - 'apps/*'
  - 'packages/*'
`;
    files.push({
      path: 'pnpm-workspace.yaml',
      content: pnpmWorkspace,
    });

    const turboJson = {
      $schema: 'https://turbo.build/schema.json',
      tasks: {
        build: {
          dependsOn: ['^build'],
          outputs: ['dist/**', '.next/**'],
        },
        dev: {
          cache: false,
          persistent: true,
        },
        test: {
          dependsOn: ['^build'],
          outputs: [],
        },
        lint: {
          outputs: [],
        },
        clean: {
          cache: false,
        },
      },
    };

    files.push({
      path: 'turbo.json',
      content: JSON.stringify(turboJson, null, 2),
    });

    // Shared packages: packages/types
    const typesPkg = renderSharedTypesPackage(config.project.name);
    files.push({ path: 'packages/types/package.json', content: typesPkg.packageJson });
    files.push({ path: 'packages/types/tsconfig.json', content: typesPkg.tsconfig });
    files.push({ path: 'packages/types/src/index.ts', content: typesPkg.indexTs });

    // Shared packages: packages/config
    const configPkg = renderSharedConfigPackage(config.project.name);
    files.push({ path: 'packages/config/package.json', content: configPkg.packageJson });
    files.push({ path: 'packages/config/tsconfig.json', content: configPkg.tsconfig });
    files.push({ path: 'packages/config/src/index.ts', content: configPkg.indexTs });

    // Dedicated Worker app: apps/worker (if BullMQ is enabled)
    if (config.queue?.provider === 'bullmq') {
      const workerApp = renderWorkerApp(config.project.name);
      files.push({ path: 'apps/worker/package.json', content: workerApp.packageJson });
      files.push({ path: 'apps/worker/tsconfig.json', content: workerApp.tsconfig });
      files.push({ path: 'apps/worker/src/index.ts', content: workerApp.indexTs });
    }
  }

  // 2. Backend Files
  if ((isFullstack || isBackend) && config.backend && config.backend.framework !== 'none') {
    files.push(...generateBackendFiles(config, backendBase));
    files.push(...generateDatabaseFiles(config, backendBase));
    files.push(...generateCacheFiles(config, backendBase));
    files.push(...generateQueueFiles(config, backendBase));
    files.push(...generateObservabilityFiles(config, backendBase));
  }

  // 3. Frontend Files
  if ((isFullstack || isFrontend) && config.frontend && config.frontend.framework !== 'none') {
    files.push(...generateFrontendFiles(config, frontendBase));
  }

  // 4. Infrastructure (Docker, Terraform, Kubernetes)
  files.push(...generateDockerFiles(config, isFullstack));
  if (config.infrastructure?.iac === 'terraform' || isInfra) {
    files.push(...generateTerraformFiles(config));
  }
  if (config.infrastructure?.iac === 'kubernetes' || isInfra) {
    files.push(...generateKubernetesFiles(config));
  }

  // 5. CI/CD & Documentation
  files.push(...generateCicdFiles(config));
  files.push(...generateDocsAndConfigs(config, isFullstack));

  return files;
}

export async function writeGeneratedFiles(files: GeneratedFile[], targetDir: string): Promise<void> {
  for (const file of files) {
    const fullPath = path.join(targetDir, file.path);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file.content, 'utf-8');
  }
}
