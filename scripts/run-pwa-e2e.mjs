import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteEntry = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const playwrightEntry = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');

const run = (args, env = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
      cwd: projectRoot,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`子进程被信号 ${signal} 终止`));
      } else {
        resolve(code ?? 1);
      }
    });
  });

const buildExitCode = await run([viteEntry, 'build']);
if (buildExitCode !== 0) process.exit(buildExitCode);

const testExitCode = await run([playwrightEntry, 'test', '--config=playwright.config.mjs'], {
  PLAYWRIGHT_PWA: '1',
});
process.exit(testExitCode);
