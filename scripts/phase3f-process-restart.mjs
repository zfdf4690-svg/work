import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-work-assistant-phase3f-process-'));
const databasePath = path.join(runRoot, 'data.db');
const manifestPath = path.join(runRoot, 'manifest.json');
const workerPath = path.join(root, 'src', 'core', 'services', 'phase3fPersistenceWorker.ts');
let failed = false;

function runProcess(mode) {
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', workerPath, mode, databasePath, manifestPath,
  ], { cwd: root, encoding: 'utf8', windowsHide: true });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  assert.equal(result.error, undefined, `${mode} process launch should succeed`);
  assert.equal(result.status, 0, `${mode} must be a separate successful Node process (status=${result.status})`);
  const marker = (result.stdout || '').split('\n').find((line) => line.startsWith('PHASE3F_RESULT='));
  assert.ok(marker, `${mode} process must return its structured result`);
  return JSON.parse(marker.slice('PHASE3F_RESULT='.length));
}

try {
  console.log(`PHASE 3-F process restart test; temporary DB=${databasePath}`);
  const processA = runProcess('write');
  assert.equal(processA.databasePath, databasePath);
  assert.ok(fs.existsSync(databasePath), 'Process A must leave its SQLite database behind');
  console.log(`[Process A] pid=${processA.pid} exited with SQLite closed; db=${processA.databasePath}`);

  const processB = runProcess('verify');
  assert.equal(processB.databasePath, processA.databasePath);
  assert.deepEqual(processB.migrationResult, { applied: [], skipped: ['001_init.sql'] });
  assert.notEqual(processB.pid, processA.pid, 'Process B must have a distinct OS process');
  console.log(`[Process B] pid=${processB.pid} differs from Process A; read same DB=${processB.databasePath}`);

  const processC = runProcess('verify-delete');
  assert.equal(processC.databasePath, processA.databasePath);
  assert.equal(processC.confirmationAbsent, true);
  assert.notEqual(processC.pid, processB.pid, 'Process C must have a distinct OS process');
  console.log(`[Process C] pid=${processC.pid}; confirmed delete remained absent after restart; db=${processC.databasePath}`);
  console.log('HARD GATE A — Process A → Process B: PASS');
  console.log('Confirmation false/true across restart: PASS');
} catch (error) {
  failed = true;
  console.error('HARD GATE A — Process A → Process B: FAIL');
  console.error(error);
  console.error(`Preserved isolated test directory for diagnosis: ${runRoot}`);
  process.exitCode = 1;
} finally {
  if (!failed) fs.rmSync(runRoot, { recursive: true, force: true });
}
