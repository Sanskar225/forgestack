import { promises as fs } from 'node:fs';
import pc from 'picocolors';
import { serializeForgeConfig, validateForgeConfig } from '@sanskar22/core';
import { loadLocalConfig } from './validate.js';
import { runGenerateCommand } from './generate.js';

export async function runRemoveCommand(moduleName: string): Promise<void> {
  if (!moduleName) {
    console.error(pc.red('\n❌ Error: Please specify a module to remove (e.g. forge remove redis, forge remove bullmq)\n'));
    process.exit(1);
  }

  const mod = moduleName.toLowerCase().trim();
  console.log(pc.bold(pc.cyan(`\n🗑️ ForgeStack: Removing architecture module '${mod}'...\n`)));

  try {
    const { config, configPath } = await loadLocalConfig();
    const updatedConfig = { ...config };

    switch (mod) {
      case 'redis':
        updatedConfig.cache = { provider: 'none' };
        if (updatedConfig.queue?.provider === 'bullmq') {
          updatedConfig.queue = { provider: 'none' };
          console.log(pc.yellow('⚠ Note: BullMQ was also removed as it depends on Redis.'));
        }
        break;

      case 'bullmq':
        updatedConfig.queue = { provider: 'none' };
        break;

      case 'auth':
      case 'jwt':
        updatedConfig.auth = { strategy: 'none' };
        break;

      case 's3':
        if (updatedConfig.infrastructure?.aws?.storage) {
          updatedConfig.infrastructure.aws.storage = updatedConfig.infrastructure.aws.storage.filter((s) => s !== 's3');
        }
        break;

      case 'terraform':
        if (updatedConfig.infrastructure?.iac === 'terraform') {
          updatedConfig.infrastructure.iac = 'none';
        }
        break;

      case 'kubernetes':
      case 'k8s':
        if (updatedConfig.infrastructure?.iac === 'kubernetes') {
          updatedConfig.infrastructure.iac = 'none';
        }
        break;

      default:
        console.error(pc.red(`\n❌ Error: Unknown module '${moduleName}'\n`));
        process.exit(1);
    }

    const validation = validateForgeConfig(updatedConfig);
    if (!validation.valid) {
      console.error(pc.red('\n❌ Cannot remove module due to architecture constraint violation:'));
      for (const err of validation.errors) {
        console.error(`  • ${err.message}`);
      }
      process.exit(1);
    }

    await fs.writeFile(configPath, serializeForgeConfig(updatedConfig), 'utf-8');
    console.log(pc.green(`✔ Removed '${mod}' from forge.config.yaml.`));

    await runGenerateCommand();
  } catch (error: any) {
    console.error(pc.red(`\n❌ Failed to remove module: ${error.message}\n`));
    process.exit(1);
  }
}
