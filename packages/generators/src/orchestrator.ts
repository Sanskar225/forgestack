import { promises as fs } from 'node:fs';
import path from 'node:path';
import { validateForgeConfig, type ForgeConfig } from '@forgestack/core';
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

  // 1. Root Monorepo structure for Full-Stack
  if (isFullstack) {
    const rootPkg = {
      name: config.project.name,
      version: '0.1.0',
      private: true,
      workspaces: ['apps/*'],
      scripts: {
        dev: 'npm run dev --workspaces',
        build: 'npm run build --workspaces',
        test: 'npm run test --workspaces',
        clean: 'npm run clean --workspaces',
      },
      devDependencies: {
        typescript: '^5.7.3',
      },
    };
    files.push({
      path: 'package.json',
      content: JSON.stringify(rootPkg, null, 2),
    });
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
