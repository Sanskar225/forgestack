import pc from 'picocolors';
import { orchestrateProjectGeneration, writeGeneratedFiles } from '@sanskar22/generators';
import { loadLocalConfig } from './validate.js';
import { runVisualizeCommand } from './visualize.js';

export async function runGenerateCommand(): Promise<void> {
  console.log(pc.bold(pc.cyan('\n⚙️ ForgeStack: Synchronizing codebase from forge.config.yaml...\n')));

  try {
    const { config } = await loadLocalConfig();
    const cwd = process.cwd();

    const files = await orchestrateProjectGeneration(config);
    await writeGeneratedFiles(files, cwd);

    console.log(pc.green(`✔ Successfully synchronized ${files.length} project files with canonical architecture spec!`));

    await runVisualizeCommand();
  } catch (error: any) {
    console.error(pc.red(`\n❌ Generation failed: ${error.message}\n`));
    process.exit(1);
  }
}
