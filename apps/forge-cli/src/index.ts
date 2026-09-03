import { Command } from 'commander';
import { runValidateCommand } from './commands/validate.js';
import { runVisualizeCommand } from './commands/visualize.js';
import { runGenerateCommand } from './commands/generate.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runAddCommand } from './commands/add.js';
import { runRemoveCommand } from './commands/remove.js';
import { runDiffCommand } from './commands/diff.js';

export function createForgeCli(): Command {
  const program = new Command();

  program
    .name('forge')
    .description('ForgeStack Architecture Manager CLI')
    .version('1.0.0');

  program
    .command('validate')
    .description('Validate forge.config.yaml architecture rules and dependency constraints')
    .action(runValidateCommand);

  program
    .command('visualize')
    .description('Display ASCII architecture diagram and refresh ARCHITECTURE.md + architecture.mmd')
    .action(runVisualizeCommand);

  program
    .command('generate')
    .description('Synchronize code and infrastructure files with canonical forge.config.yaml')
    .action(runGenerateCommand);

  program
    .command('doctor')
    .description('Run environment, runtime, container, and database port health checks')
    .action(runDoctorCommand);

  program
    .command('add <module>')
    .description('Add an architectural capability (redis, bullmq, auth, s3, terraform, k8s, prisma, drizzle, mongoose)')
    .action(runAddCommand);

  program
    .command('remove <module>')
    .description('Remove an architectural capability from forge.config.yaml')
    .action(runRemoveCommand);

  program
    .command('diff')
    .description('Check for architectural drift between codebase and forge.config.yaml')
    .action(runDiffCommand);

  return program;
}

export async function run(): Promise<void> {
  const program = createForgeCli();
  await program.parseAsync(process.argv);
}
