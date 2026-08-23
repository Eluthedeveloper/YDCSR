import { getDb, initializeDb, closeDb } from './connection';
import { radioHomeGroups } from './schema';
import { eq } from 'drizzle-orm';

async function main() {
  await initializeDb();
  const db = getDb();

  const rows = await db.select({ id: radioHomeGroups.id, serialNumber: radioHomeGroups.serialNumber }).from(radioHomeGroups);

  const digitCount = (s: string) => {
    const num = s.split('-').pop() || '';
    return /^\d+$/.test(num) ? num.length : 0;
  };

  const width = rows.reduce((max, r) => Math.max(max, digitCount(r.serialNumber)), 0);
  const targetWidth = Math.max(4, width);

  let updated = 0;
  for (const r of rows) {
    const idx = r.serialNumber.lastIndexOf('-');
    const code = r.serialNumber.slice(0, idx);
    const numStr = r.serialNumber.slice(idx + 1);
    if (!/^\d+$/.test(numStr)) continue;

    const padded = `${code}-${numStr.padStart(targetWidth, '0')}`;
    if (padded === r.serialNumber) continue;

    await db.update(radioHomeGroups).set({ serialNumber: padded }).where(eq(radioHomeGroups.id, r.id));
    updated++;
  }

  console.log(`Padded ${updated} of ${rows.length} serials to width ${targetWidth}`);
  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to pad serials:', err);
  process.exit(1);
});
