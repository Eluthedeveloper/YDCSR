import { getDb } from '../db/connection';
import { appSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateUUID } from '../utils/helpers';

const LOGIN_LOGGING_KEY = 'login_logging_paused';

export class SettingsService {
  async isLoginLoggingPaused(): Promise<boolean> {
    const db = getDb();
    const [row] = await db.select()
      .from(appSettings)
      .where(eq(appSettings.key, LOGIN_LOGGING_KEY))
      .limit(1);
    return row?.value === 'true';
  }

  async setLoginLoggingPaused(paused: boolean): Promise<void> {
    const db = getDb();
    const [existing] = await db.select()
      .from(appSettings)
      .where(eq(appSettings.key, LOGIN_LOGGING_KEY))
      .limit(1);
    if (existing) {
      await db.update(appSettings)
        .set({ value: String(paused), updatedAt: new Date() })
        .where(eq(appSettings.id, existing.id));
    } else {
      await db.insert(appSettings).values({
        id: generateUUID(),
        key: LOGIN_LOGGING_KEY,
        value: String(paused),
      });
    }
  }
}

export const settingsService = new SettingsService();
