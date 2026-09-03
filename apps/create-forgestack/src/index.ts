import path from 'node:path';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import {
  validateForgeConfig,
  autoFixForgeConfig,
  renderAsciiArchitecture,
  type ForgeConfig,
} from '@forgestack/core';
import { orchestrateProjectGeneration, writeGeneratedFiles } from '@forgestack/generators';
import { BUILTIN_PRESETS } from './presets/index.js';
import { promptUserConfig } from './prompts/index.js';

export async function run(): Promise<void> {
  const program = new Command();

  program
    .name('create-forgestack')
    .description('Architecture-aware application & infrastructure generator')
    .argument('[projectName]', 'Name of the project directory to create')
    .option('-p, --preset <preset>', 'Scaffold using a pre-configured architecture preset (saas, minimal-api, infra-aws, infra-k8s)')
    .option('-y, --yes', 'Accept defaults without interactive prompts', false)
    .parse(process.argv);

  const options = program.opts();
  const [projectNameArg] = program.args;

  let config: ForgeConfig;

  if (options.preset) {
    const presetFn = BUILTIN_PRESETS[options.preset];
    if (!presetFn) {
      console.error(pc.red(`\n❌ Error: Unknown preset '${options.preset}'. Available presets: ${Object.keys(BUILTIN_PRESETS).join(', ')}\n`));
      process.exit(1);
    }
    const name = projectNameArg || 'my-forgestack-app';
    config = presetFn(name);
    p.intro(pc.bgCyan(pc.black(` 🚀 ForgeStack: Initializing preset '${options.preset}' `)));
  } else {
    config = await promptUserConfig(projectNameArg);
  }

  // Run Architecture Validation
  const s = p.spinner();
  s.start('Validating architecture constraints & dependency graph...');

  let validation = validateForgeConfig(config);

  if (!validation.valid) {
    s.stop(pc.yellow('Architecture validation detected fixable conflicts'));
    for (const err of validation.errors) {
      p.log.warn(`${pc.bold(pc.yellow(`[${err.code}]`))} ${err.message}`);
      if (err.recommendation) {
        p.log.message(pc.cyan(`💡 Recommendation: ${err.recommendation}`));
      }
    }
    config = autoFixForgeConfig(config);
    validation = validateForgeConfig(config);
    if (!validation.valid) {
      p.cancel(pc.red('Architecture conflict cannot be auto-resolved. Please review your choices.'));
      process.exit(1);
    }
    p.log.success(pc.green('Auto-resolved architecture dependencies successfully!'));
  } else {
    s.stop(pc.green('Architecture validated successfully! No conflicts detected.'));
  }

  if (validation.warnings.length > 0) {
    for (const warn of validation.warnings) {
      p.log.warn(`${pc.bold(pc.yellow(`[${warn.code}]`))} ${warn.message}`);
      if (warn.recommendation) {
        p.log.message(pc.cyan(`💡 Suggestion: ${warn.recommendation}`));
      }
    }
  }

  // Generate Files
  const targetDir = path.resolve(process.cwd(), config.project.name);
  s.start(`Generating ${config.project.type} application & infrastructure at ${pc.bold(config.project.name)}...`);

  try {
    const files = await orchestrateProjectGeneration(config);
    await writeGeneratedFiles(files, targetDir);
    s.stop(pc.green(`Successfully generated ${files.length} production-ready files!`));
  } catch (error: any) {
    s.stop(pc.red('Generation failed.'));
    console.error(error);
    process.exit(1);
  }

  // Visual Architecture Summary
  console.log('\n' + pc.cyan(renderAsciiArchitecture(config)) + '\n');

  p.note(
    `cd ${pc.cyan(config.project.name)}\n` +
      `cp .env.example .env\n` +
      `docker compose up -d    # start local Postgres & Redis\n` +
      `npm install\n` +
      `npm run dev\n\n` +
      `# Manage architecture with local CLI:\n` +
      `npx forge doctor\n` +
      `npx forge visualize\n` +
      `npx forge add <module>`,
    'Next Steps'
  );

  p.outro(pc.bgGreen(pc.black(' ✨ Project ready for production engineering! ')));
}
