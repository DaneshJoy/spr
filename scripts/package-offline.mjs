import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const offlineDir = path.join(root, 'offline');

await execFileAsync('npm', ['run', 'build'], { cwd: root });
await rm(offlineDir, { recursive: true, force: true });
await mkdir(offlineDir);
await execFileAsync('python3', [
  path.join(root, 'scripts', 'create-zip.py'),
  path.join(root, 'dist'),
  path.join(offlineDir, 'statistical-pattern-recognition-offline.zip'),
]);
