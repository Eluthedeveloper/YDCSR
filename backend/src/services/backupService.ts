import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

const BACKUP_DIR = path.join(process.cwd(), config.backup.dir);

const NAME_RE = /^[\w.-]+\.sql$/;

let cachedDumpBin: string | null = null;

/**
 * Locates a usable mysqldump binary: explicit MYSQLDUMP_PATH env var first,
 * then PATH, then the usual Windows/XAMPP and Linux install locations.
 */
function resolveMysqldump(): string {
  if (cachedDumpBin) return cachedDumpBin;

  const candidates: string[] = [];
  if (process.env.MYSQLDUMP_PATH) candidates.push(process.env.MYSQLDUMP_PATH);
  candidates.push('mysqldump');
  candidates.push(
    'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    'C:\\wamp64\\bin\\mysql\\mysqldump.exe',
    'C:\\laragon\\bin\\mysql\\mysqldump.exe',
    '/usr/bin/mysqldump',
    '/usr/local/bin/mysqldump',
    '/usr/local/mysql/bin/mysqldump',
  );
  for (const base of ['C:\\Program Files\\MySQL', 'C:\\Program Files (x86)\\MySQL']) {
    try {
      for (const ver of fs.readdirSync(base)) {
        const p = path.join(base, ver, 'bin', 'mysqldump.exe');
        if (fs.existsSync(p)) candidates.push(p);
      }
    } catch {
      // directory does not exist - ignore
    }
  }

  for (const candidate of candidates) {
    if (candidate === 'mysqldump') continue; // handled by spawn fallback below
    if (candidate.includes('*')) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      cachedDumpBin = candidate;
      return candidate;
    }
  }

  // Last resort: rely on PATH resolution.
  cachedDumpBin = 'mysqldump';
  return cachedDumpBin;
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function getBackupFilePath(name: string): string | null {
  if (!NAME_RE.test(name) || name.includes('..')) return null;
  const resolved = path.resolve(BACKUP_DIR, name);
  if (!resolved.startsWith(BACKUP_DIR)) return null;
  return fs.existsSync(resolved) ? resolved : null;
}

export interface BackupFileInfo {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

export async function createBackup(trigger: 'auto' | 'manual'): Promise<BackupFileInfo> {
  ensureBackupDir();
  const dumpBin = resolveMysqldump();

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const fileName = `${config.db.name}_${stamp}${trigger === 'manual' ? '_manual' : ''}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const args = [
    '-h', config.db.host,
    '-P', String(config.db.port),
    '-u', config.db.user,
    '--no-tablespaces',
    '--single-transaction',
    '--routines',
    '--triggers',
    '--default-character-set=utf8mb4',
    config.db.name,
  ];

  // Pass the password via MYSQL_PWD, not `-p...` on argv, so it is not exposed
  // in the process list to other users on the shared host.
  const env = {
    ...process.env,
    ...(config.db.password ? { MYSQL_PWD: config.db.password } : {}),
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(dumpBin, args, { windowsHide: true, env });
    const out = fs.createWriteStream(filePath);
    let stderr = '';
    let streamDone = false;
    let childDone = false;
    let failed = false;

    const finish = () => {
      if (failed) return;
      if (streamDone && childDone) resolve();
    };

    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('error', (err) => {
      failed = true;
      out.destroy();
      fs.unlink(filePath, () => {});
      reject(new Error(
        `Could not run mysqldump (${dumpBin}). ${err.message} ` +
        'Set MYSQLDUMP_PATH in backend/.env to the full mysqldump binary path.'
      ));
    });
    child.on('close', (code) => {
      childDone = true;
      if (code !== 0) {
        failed = true;
        fs.unlink(filePath, () => {});
        reject(new Error(stderr.trim() || `mysqldump exited with code ${code}`));
        return;
      }
      finish();
    });
    out.on('error', (err) => {
      failed = true;
      child.kill();
      fs.unlink(filePath, () => {});
      reject(err);
    });
    out.on('finish', () => {
      streamDone = true;
      finish();
    });

    child.stdout.pipe(out);
  });

  const stat = fs.statSync(filePath);
  logger.info(`Database backup created (${trigger}): ${fileName} (${stat.size} bytes)`);
  return { name: fileName, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
}

export async function listBackups(): Promise<BackupFileInfo[]> {
  ensureBackupDir();
  const entries = await fs.promises.readdir(BACKUP_DIR);
  const items: BackupFileInfo[] = [];
  for (const name of entries) {
    if (!NAME_RE.test(name)) continue;
    const stat = await fs.promises.stat(path.join(BACKUP_DIR, name));
    items.push({ name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() });
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

export async function deleteBackup(name: string): Promise<boolean> {
  const filePath = getBackupFilePath(name);
  if (!filePath) return false;
  await fs.promises.unlink(filePath);
  return true;
}

/** Keeps only the newest `keep` backups; older ones are removed. */
export async function pruneOldBackups(keep = config.backup.keep): Promise<number> {
  const items = await listBackups();
  const stale = items.slice(keep);
  for (const item of stale) {
    await deleteBackup(item.name).catch(() => {});
  }
  if (stale.length > 0) logger.info(`Pruned ${stale.length} old database backup(s)`);
  return stale.length;
}
