import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

const password = process.env.DB_PASSWORD || '';
const url = `mysql://${process.env.DB_USER || 'root'}${password ? `:${password}` : ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'ydcs_radio_home'}`;

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'mysql',
  dbCredentials: { url },
});
