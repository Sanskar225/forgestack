import { promises as fs } from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { renderAsciiArchitecture, generateArchitectureDoc, generateMermaidDiagram } from '@forgestack/core';
import { loadLocalConfig } from './validate.js';

export async function runVisualizeCommand(): Promise<void> {
  try {
    const { config } = await loadLocalConfig();

    console.log(pc.bold(pc.cyan('\n📐 Architecture Topology Visualization:\n')));
    console.log(pc.cyan(renderAsciiArchitecture(config)));
    console.log('');

    const cwd = process.cwd();
    await fs.writeFile(path.join(cwd, 'ARCHITECTURE.md'), generateArchitectureDoc(config), 'utf-8');
    await fs.writeFile(path.join(cwd, 'architecture.mmd'), generateMermaidDiagram(config), 'utf-8');

    console.log(pc.green('✔ Updated ARCHITECTURE.md and architecture.mmd with current topology.\n'));
  } catch (error: any) {
    console.error(pc.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}
