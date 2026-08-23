import { initializeDb, getPool, closeDb } from '../src/db/connection';

async function main() {
  await initializeDb();
  const pool = getPool();

  const [rows]: any[] = await pool.query("SHOW COLUMNS FROM reports LIKE 'report_date'");
  if (rows.length > 0) {
    console.log('report_date column already exists');
  } else {
    await pool.query('ALTER TABLE reports ADD COLUMN report_date datetime NOT NULL DEFAULT (now())');
    console.log('report_date column added');
  }

  const [idx]: any[] = await pool.query("SHOW INDEX FROM reports WHERE Key_name = 'reports_report_date_idx'");
  if (idx.length === 0) {
    await pool.query('CREATE INDEX reports_report_date_idx ON reports (report_date)');
    console.log('index created');
  } else {
    console.log('index already exists');
  }

  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
