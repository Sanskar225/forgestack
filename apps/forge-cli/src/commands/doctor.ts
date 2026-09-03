import net from 'node:net';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import pc from 'picocolors';
import { loadLocalConfig } from './validate.js';

const execAsync = promisify(exec);

async function checkPortOpen(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

export async function runDoctorCommand(): Promise<void> {
  console.log(pc.bold(pc.cyan('\n🩺 ForgeStack Doctor: Environment & Service Diagnostics\n')));

  let config;
  try {
    const loaded = await loadLocalConfig();
    config = loaded.config;
  } catch {
    // Run general diagnostics without project config
  }

  // 1. Node.js Check
  const nodeVersion = process.version;
  const majorNode = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
  if (majorNode >= 18) {
    console.log(`  ${pc.green('✔')} Node.js Runtime: ${pc.bold(nodeVersion)} (Supported)`);
  } else {
    console.log(`  ${pc.red('❌')} Node.js Runtime: ${pc.bold(nodeVersion)} (Requires >= v18.0.0)`);
  }

  // 2. Docker Check
  let dockerOk = false;
  try {
    const { stdout } = await execAsync('docker --version');
    console.log(`  ${pc.green('✔')} Docker Engine: ${pc.bold(stdout.trim())}`);
    dockerOk = true;
  } catch {
    console.log(`  ${pc.yellow('⚠')} Docker Engine: Not found or not running in PATH`);
  }

  // 3. PostgreSQL Port Check (if configured)
  const hasPostgres = config?.database?.provider === 'postgresql';
  if (hasPostgres) {
    const isPgUp = await checkPortOpen('127.0.0.1', 5432);
    if (isPgUp) {
      console.log(`  ${pc.green('✔')} PostgreSQL (port 5432): Accessible`);
    } else {
      console.log(`  ${pc.yellow('⚠')} PostgreSQL (port 5432): Not responding on localhost:5432`);
      if (dockerOk) {
        console.log(`    ${pc.cyan('↳ Recommendation:')} Run ${pc.bold('docker compose up -d postgres')}`);
      }
    }
  }

  // 4. Redis Port Check (if configured)
  const hasRedis = config?.cache?.provider === 'redis' || config?.queue?.provider === 'bullmq';
  if (hasRedis) {
    const isRedisUp = await checkPortOpen('127.0.0.1', 6379);
    if (isRedisUp) {
      console.log(`  ${pc.green('✔')} Redis Cache (port 6379): Accessible`);
    } else {
      console.log(`  ${pc.yellow('⚠')} Redis Cache (port 6379): Not responding on localhost:6379`);
      if (dockerOk) {
        console.log(`    ${pc.cyan('↳ Recommendation:')} Run ${pc.bold('docker compose up -d redis')}`);
      }
    }
  }

  // 5. MongoDB Port Check (if configured)
  const hasMongo = config?.database?.provider === 'mongodb';
  if (hasMongo) {
    const isMongoUp = await checkPortOpen('127.0.0.1', 27017);
    if (isMongoUp) {
      console.log(`  ${pc.green('✔')} MongoDB (port 27017): Accessible`);
    } else {
      console.log(`  ${pc.yellow('⚠')} MongoDB (port 27017): Not responding on localhost:27017`);
      if (dockerOk) {
        console.log(`    ${pc.cyan('↳ Recommendation:')} Run ${pc.bold('docker compose up -d mongodb')}`);
      }
    }
  }

  console.log(pc.bold(pc.cyan('\n✨ Diagnostics complete!\n')));
}
