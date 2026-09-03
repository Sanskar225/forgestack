import { promises as fs } from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { orchestrateProjectGeneration } from '@forgestack/generators';
import { loadLocalConfig } from './validate.js';

export async function runDiffCommand(): Promise<void> {
  console.log(pc.bold(pc.cyan('\n🔍 ForgeStack Diff: Checking Architectural Drift...\n')));

  try {
    const { config } = await loadLocalConfig();
    const cwd = process.cwd();

    const expectedFiles = await orchestrateProjectGeneration(config);

    const missingFiles: string[] = [];
    let syncedCount = 0;

    for (const expected of expectedFiles) {
      const filePath = path.join(cwd, expected.path);
      try {
        await fs.access(filePath);
        syncedCount++;
      } catch {
        missingFiles.push(expected.path);
      }
    }

    if (missingFiles.length === 0) {
      console.log(pc.green(`✔ Zero architectural drift detected! All ${syncedCount} expected files exist in current project.\n`));
    } else {
      console.log(pc.yellow(`⚠ Detected ${missingFiles.length} missing expected architecture file(s):`));
      for (const f of missingFiles) {
        console.log(`  ${pc.red('-')} ${f}`);
      }
      console.log(`\n${pc.cyan('💡 Run:')} ${pc.bold('forge generate')} to synchronize your project with forge.config.yaml.\n`);
    }
  } catch (error: any) {
    console.error(pc.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}
