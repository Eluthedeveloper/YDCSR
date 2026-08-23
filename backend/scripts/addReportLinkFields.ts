import { initializeDb, getPool, closeDb } from '../src/db/connection';

async function columnExists(column: string): Promise<boolean> {
  const pool = getPool();
  const [rows]: any[] = await pool.query('SHOW COLUMNS FROM reports LIKE ?', [column]);
  return rows.length > 0;
}

async function main() {
  await initializeDb();
  const pool = getPool();

  if (await columnExists('source_type')) {
    console.log('source_type column already exists');
  } else {
    await pool.query("ALTER TABLE reports ADD COLUMN source_type varchar(10) NOT NULL DEFAULT 'upload'");
    console.log('source_type column added');
  }

  if (await columnExists('external_url')) {
    console.log('external_url column already exists');
  } else {
    await pool.query('ALTER TABLE reports ADD COLUMN external_url varchar(500) NULL');
    console.log('external_url column added');
  }

  // Link-based reports have no stored file, so these must allow NULL.
  await pool.query('ALTER TABLE reports MODIFY file_name varchar(255) NULL');
  await pool.query('ALTER TABLE reports MODIFY original_name varchar(255) NULL');
  console.log('file_name and original_name are now nullable');

  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
