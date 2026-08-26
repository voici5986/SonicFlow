import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supportedExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.json5',
  '.jsonc',
  '.md',
  '.mjs',
  '.scss',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

const gitResult = spawnSync('git', ['ls-files', '-z'], {
  cwd: projectRoot,
  encoding: 'utf8',
});

if (gitResult.error || gitResult.status !== 0) {
  console.error('无法读取 Git 跟踪文件，拒绝跳过格式检查。');
  process.exit(1);
}

const files = gitResult.stdout
  .split('\0')
  .filter(Boolean)
  .filter((file) => existsSync(path.join(projectRoot, file)))
  .filter((file) => supportedExtensions.has(path.extname(file).toLowerCase()));

const prettierEntry = path.join(projectRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
const prettierResult = spawnSync(process.execPath, [prettierEntry, '--check', ...files], {
  cwd: projectRoot,
  stdio: 'inherit',
});

process.exit(prettierResult.status ?? 1);
