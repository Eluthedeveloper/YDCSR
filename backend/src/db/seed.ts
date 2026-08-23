import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './connection';
import { users, regionalStates, regions, languages, serialSequences } from './schema';
import { eq, sql } from 'drizzle-orm';

const defaultRegionalStates = [
  { name: 'Oromia', code: 'OR', defaultLanguage: 'Afan Oromo' },
  { name: 'Amhara', code: 'AMH', defaultLanguage: 'Amharic' },
  { name: 'Addis Ababa', code: 'AA', defaultLanguage: 'Amharic' },
  { name: 'Tigray', code: 'TIG', defaultLanguage: 'Tigrinya' },
  { name: 'Somali', code: 'SOM', defaultLanguage: 'Somali' },
  { name: 'Sidama', code: 'SID', defaultLanguage: 'Sidama' },
  { name: 'Harari', code: 'HAR', defaultLanguage: 'Harari' },
  { name: 'Afar', code: 'AFR', defaultLanguage: 'Afar' },
  { name: 'Gambella', code: 'GAM', defaultLanguage: 'Nuer' },
  { name: 'Benishangul Gumuz', code: 'BEN', defaultLanguage: 'Berta' },
  { name: 'South Ethiopia', code: 'SE', defaultLanguage: 'Wolaytta' },
  { name: 'South West Ethiopia', code: 'SWE', defaultLanguage: 'Bench' },
  { name: 'Central Ethiopia', code: 'CE', defaultLanguage: 'Hadiyya' },
  { name: 'Dire Dawa', code: 'DD', defaultLanguage: 'Amharic' },
];

const sampleRegions: Record<string, string[]> = {
  'Oromia': ['East Wollega', 'West Wollega', 'East Shewa', 'West Shewa', 'North Shewa', 'Arsi', 'Bale', 'Jimma', 'Illubabor', 'Guji', 'Borana'],
  'Amhara': ['North Gondar', 'South Gondar', 'North Wollo', 'South Wollo', 'North Shewa', 'East Gojjam', 'West Gojjam', 'Wag Hemra', 'Awi'],
  'Addis Ababa': ['Addis Ketema', 'Lideta', 'Kirkos', 'Yeka', 'Bole', 'Kolfe Keranio', 'Gulele', 'Nifas Silk-Lafto', 'Akaki Kality'],
  'Tigray': ['East Tigray', 'West Tigray', 'Central Tigray', 'South Tigray', 'North West Tigray'],
  'Somali': ['Jijiga', 'Shinile', 'Fafan', 'Korahe', 'Gode', 'Afder', 'Liben', 'Dollo', 'Nogob', 'Erer', 'Sitti'],
  'Sidama': ['Hawassa', 'Aleta Wendo', 'Bensa', 'Chuko', 'Dale', 'Loko Abaya', 'Malga', 'Shebedino'],
  'Harari': ['Amir Nur', 'Abadir', 'Shenkor', 'Dire Teyara'],
  'Afar': ['Awsi', 'Kilbet', 'Gabi', 'Fanti'],
  'Gambella': ['Itang', 'Nuwer', 'Mezhenger', 'Godere'],
  'Benishangul Gumuz': ['Metoekel', 'Kamashi', 'Selamego', 'Pawe'],
  'South Ethiopia': ['Wolaytta', 'Gamo', 'Gofa', 'Konso', 'Derashe'],
  'South West Ethiopia': ['Bench', 'Sheka', 'Kafa', 'Dawro'],
  'Central Ethiopia': ['Hadiyya', 'Kambata', 'Tambaro', 'Silte', 'Alaba'],
  'Dire Dawa': ['Bishan', 'Gurgura', 'Delegates'],
};

const defaultLanguages = [
  'Afan Oromo', 'Amharic', 'Tigrinya', 'Somali', 'Sidama',
  'Harari', 'Afar', 'Nuer', 'Berta', 'Wolaytta', 'Bench',
  'Hadiyya', 'English', 'Guji Oromo', 'Borana Oromo',
];

export async function seedDefaultData() {
  const db = getDb();

  const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await db.insert(users).values({
      id: uuidv4(),
      fullName: 'System Admin',
      username: 'admin',
      phone: '+251911111111',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    });
    console.log('Default admin user created (admin/admin123)');
  }

  for (const lang of defaultLanguages) {
    const existing = await db.select().from(languages).where(eq(languages.name, lang)).limit(1);
    if (existing.length === 0) {
      await db.insert(languages).values({ id: uuidv4(), name: lang });
    }
  }

  for (const rs of defaultRegionalStates) {
    const existing = await db.select().from(regionalStates).where(eq(regionalStates.name, rs.name)).limit(1);
    let rsId: string;
    if (existing.length === 0) {
      rsId = uuidv4();
      await db.insert(regionalStates).values({
        id: rsId,
        name: rs.name,
        code: rs.code,
        defaultLanguage: rs.defaultLanguage,
        status: 'active',
      });

      const subRegions = sampleRegions[rs.name] || [];
      for (const subName of subRegions) {
        await db.insert(regions).values({
          id: uuidv4(),
          name: subName,
          regionalStateId: rsId,
          status: 'active',
        });
      }

      const langExisting = await db.select().from(languages).where(eq(languages.name, rs.defaultLanguage)).limit(1);
      if (langExisting.length === 0) {
        await db.insert(languages).values({ id: uuidv4(), name: rs.defaultLanguage });
      }
    } else {
      rsId = existing[0].id;
    }

    // Ensure a serial sequence row exists WITHOUT resetting an existing counter
    // (resetting to 0 on every startup would cause duplicate serial numbers).
    await db.insert(serialSequences).values({
      id: uuidv4(),
      regionCode: rs.code,
      lastNumber: 0,
    }).onDuplicateKeyUpdate({ set: { lastNumber: sql`last_number` } });
  }

  console.log('Default data seeded successfully');
}
