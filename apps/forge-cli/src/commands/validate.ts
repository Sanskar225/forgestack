import { promises as fs } from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { parseForgeConfig, validateForgeConfig } from '@sanskar22/core';

export async function loadLocalConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, 'forge.config.yaml');
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    return { config: parseForgeConfig(raw), configPath };
  } catch {
    throw new Error(`Could not find 'forge.config.yaml' in ${cwd}. Make sure you are in a ForgeStack project directory.`);
  }
}

export async function runValidateCommand(): Promise<void> {
  console.log(pc.bold(pc.cyan('\n🔍 ForgeStack: Validating Architecture Specification...\n')));

  try {
    const { config, configPath } = await loadLocalConfig();
    console.log(pc.dim(`Loaded: ${configPath}\n`));

    const result = validateForgeConfig(config);

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(pc.green('✔ Architecture specification is 100% valid and conflict-free!\n'));
      return;
    }

    if (result.errors.length > 0) {
      console.log(pc.red(pc.bold(`❌ Validation Errors (${result.errors.length}):`)));
      for (const err of result.errors) {
        console.log(`  ${pc.red(`• [${err.code}]`)} ${err.message}`);
        if (err.recommendation) {
          console.log(`    ${pc.cyan(`↳ Recommendation:`)} ${err.recommendation}`);
        }
      }
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.log(pc.yellow(pc.bold(`⚠ Architecture Warnings (${result.warnings.length}):`)));
      for (const warn of result.warnings) {
        console.log(`  ${pc.yellow(`• [${warn.code}]`)} ${warn.message}`);
        if (warn.recommendation) {
          console.log(`    ${pc.cyan(`↳ Suggestion:`)} ${warn.recommendation}`);
        }
      }
      console.log('');
    }

    if (!result.valid) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(pc.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}
