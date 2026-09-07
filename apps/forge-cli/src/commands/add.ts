import { promises as fs } from 'node:fs';
import pc from 'picocolors';
import { serializeForgeConfig, validateForgeConfig, autoFixForgeConfig } from '@sanskar225/core';
import { loadLocalConfig } from './validate.js';
import { runGenerateCommand } from './generate.js';

export async function runAddCommand(moduleName: string): Promise<void> {
  if (!moduleName) {
    console.error(pc.red('\n❌ Error: Please specify a module to add (e.g. forge add redis, forge add bullmq, forge add auth)\n'));
    process.exit(1);
  }

  const mod = moduleName.toLowerCase().trim();
  console.log(pc.bold(pc.cyan(`\n📦 ForgeStack: Adding architecture module '${mod}'...\n`)));

  try {
    const { config, configPath } = await loadLocalConfig();
    let updatedConfig = { ...config };

    switch (mod) {
      case 'redis':
        updatedConfig.cache = { provider: 'redis' };
        break;

      case 'bullmq':
        updatedConfig.queue = { provider: 'bullmq' };
        updatedConfig.cache = { provider: 'redis' };
        break;

      case 'auth':
      case 'jwt':
        if (!updatedConfig.database || updatedConfig.database.provider === 'none') {
          updatedConfig.database = { provider: 'postgresql', orm: 'prisma' };
        }
        updatedConfig.auth = {
          strategy: 'jwt',
          features: ['refresh-tokens', 'rate-limiting'],
        };
        break;

      case 's3':
        if (!updatedConfig.infrastructure) {
          updatedConfig.infrastructure = { cloud: 'aws', iac: 'terraform' };
        }
        if (!updatedConfig.infrastructure.aws) {
          updatedConfig.infrastructure.aws = { compute: 'ecs', storage: [] };
        }
        if (!updatedConfig.infrastructure.aws.storage?.includes('s3')) {
          updatedConfig.infrastructure.aws.storage = [...(updatedConfig.infrastructure.aws.storage || []), 's3'];
        }
        break;

      case 'terraform':
        if (!updatedConfig.infrastructure) {
          updatedConfig.infrastructure = { cloud: 'aws', iac: 'terraform' };
        } else {
          updatedConfig.infrastructure.iac = 'terraform';
        }
        break;

      case 'kubernetes':
      case 'k8s':
        if (!updatedConfig.infrastructure) {
          updatedConfig.infrastructure = { cloud: 'local', iac: 'kubernetes' };
        } else {
          updatedConfig.infrastructure.iac = 'kubernetes';
        }
        if (!updatedConfig.containers) {
          updatedConfig.containers = { docker: true, compose: true };
        } else {
          updatedConfig.containers.docker = true;
        }
        break;

      case 'prisma':
        if (!updatedConfig.database || updatedConfig.database.provider === 'none') {
          updatedConfig.database = { provider: 'postgresql', orm: 'prisma' };
        } else {
          updatedConfig.database.orm = 'prisma';
        }
        break;

      case 'drizzle':
        if (!updatedConfig.database || updatedConfig.database.provider === 'none') {
          updatedConfig.database = { provider: 'postgresql', orm: 'drizzle' };
        } else {
          updatedConfig.database.orm = 'drizzle';
        }
        break;

      case 'mongoose':
        updatedConfig.database = { provider: 'mongodb', orm: 'mongoose' };
        break;

      default:
        console.error(pc.red(`\n❌ Error: Unknown module '${moduleName}'. Supported modules: redis, bullmq, auth, s3, terraform, kubernetes, prisma, drizzle, mongoose\n`));
        process.exit(1);
    }

    updatedConfig = autoFixForgeConfig(updatedConfig);
    const validation = validateForgeConfig(updatedConfig);

    if (!validation.valid) {
      console.error(pc.red('\n❌ Cannot add module due to architecture constraint violation:'));
      for (const err of validation.errors) {
        console.error(`  • ${err.message}`);
      }
      process.exit(1);
    }

    // Save updated forge.config.yaml
    await fs.writeFile(configPath, serializeForgeConfig(updatedConfig), 'utf-8');
    console.log(pc.green(`✔ Updated forge.config.yaml with '${mod}' configuration.`));

    // Synchronize codebase
    await runGenerateCommand();
  } catch (error: any) {
    console.error(pc.red(`\n❌ Failed to add module: ${error.message}\n`));
    process.exit(1);
  }
}
