import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const expectedNode = (await readFile(new URL('../.node-version', import.meta.url), 'utf8')).trim();
const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
const dockerNode = dockerfile.match(/^ARG NODE_VERSION=(.+)$/m)?.[1]?.trim();
const userAgentVersion = process.env.npm_config_user_agent?.match(/pnpm\/(\S+)/)?.[1];

const parseNodeMajor = (spec) => {
  const match = String(spec ?? '')
    .trim()
    .match(/^(\d+)(?:\.(?:\d+|x))?(?:\.(?:\d+|x))?$/i);
  return match ? Number(match[1]) : undefined;
};

const parseMajorRange = (range) => {
  const match = String(range ?? '')
    .trim()
    .match(/^>=\s*(\d+)(?:\.\d+){0,2}\s+<\s*(\d+)(?:\.\d+){0,2}$/);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : undefined;
};

const expectedNodeMajor = parseNodeMajor(expectedNode);
const expectedEngine =
  expectedNodeMajor === undefined
    ? undefined
    : `>=${expectedNodeMajor} <${expectedNodeMajor + 1}`;
const expectedPnpmRange = packageJson.engines?.pnpm;
const expectedPnpm = parseMajorRange(expectedPnpmRange);
const devEnginePackageManager = packageJson.devEngines?.packageManager;
const devPnpmRange = parseMajorRange(devEnginePackageManager?.version);
const actualNodeMajor = Number(process.versions.node.split('.')[0]);
const actualPnpmMajor = userAgentVersion
  ? Number(userAgentVersion.split('.')[0])
  : undefined;
const dockerNodeMajor = parseNodeMajor(dockerNode);

const problems = [];
if (expectedNodeMajor === undefined) {
  problems.push(`.node-version 必须是 Node 主版本、次版本或完整版本，当前为 ${expectedNode || '(空)'}`);
}
if (expectedNodeMajor !== undefined && actualNodeMajor !== expectedNodeMajor) {
  problems.push(`运行时 Node ${process.versions.node} 不在 .node-version ${expectedNode} 的主版本范围内`);
}
if (!expectedEngine || packageJson.engines?.node !== expectedEngine) {
  problems.push(
    `package.json#engines.node 必须锁定主版本范围（期望 ${expectedEngine || '(无法计算)'}，当前 ${packageJson.engines?.node || '(缺失)'})`
  );
}
if (packageJson.packageManager) {
  problems.push('package.json#packageManager 不应固定单一版本，请使用 devEngines.packageManager 范围');
}
if (!expectedPnpm) {
  problems.push(
    `package.json#engines.pnpm 必须是可解析的主版本范围（当前 ${expectedPnpmRange || '(缺失)'})`
  );
}
if (
  !devEnginePackageManager ||
  devEnginePackageManager.name !== 'pnpm' ||
  !devPnpmRange ||
  !expectedPnpm ||
  devPnpmRange.min !== expectedPnpm.min ||
  devPnpmRange.max !== expectedPnpm.max
) {
  problems.push(
    `package.json#devEngines.packageManager 必须声明 pnpm 且与 engines.pnpm 使用同一范围（期望 ${expectedPnpmRange || '(缺失)'})`
  );
}
if (!userAgentVersion) {
  problems.push('无法从 npm_config_user_agent 确认当前 pnpm 版本');
} else if (
  !expectedPnpm ||
  !Number.isInteger(actualPnpmMajor) ||
  actualPnpmMajor < expectedPnpm.min ||
  actualPnpmMajor >= expectedPnpm.max
) {
  problems.push(
    `运行时 pnpm ${userAgentVersion} 不在允许范围 ${expectedPnpmRange || '(缺失)'} 内`
  );
}
if (expectedNodeMajor !== undefined && dockerNodeMajor !== expectedNodeMajor) {
  problems.push(
    `Dockerfile 默认 Node ${dockerNode || '(缺失)'} 不在 .node-version ${expectedNode} 的主版本范围内`
  );
}

if (problems.length > 0) {
  console.error(['工具链版本检查失败：', ...problems.map((problem) => `- ${problem}`)].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`工具链范围一致：Node ${expectedEngine}，pnpm ${expectedPnpmRange}`);
}
