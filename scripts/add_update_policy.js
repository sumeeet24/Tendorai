require('dotenv').config();
const { Client } = require('pg');

// Prefer non-pooling for migrations
let connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Environment variables for database connection are missing.');
  process.exit(1);
}

connectionString = connectionString.replace(/[?&]sslmode=[^&]+/, '');
if (connectionString.endsWith('?')) connectionString = connectionString.slice(0, -1);

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const sql = `
      -- Allow users to update their own tender profiles
      DROP POLICY IF EXISTS "Users can update own tenders" ON tender_profiles;
      CREATE POLICY "Users can update own tenders" ON tender_profiles
          FOR UPDATE USING (
              EXISTS (SELECT 1 FROM company_profiles WHERE id = tender_profiles.company_id AND owner_id = auth.uid())
          )
          WITH CHECK (
              EXISTS (SELECT 1 FROM company_profiles WHERE id = tender_profiles.company_id AND owner_id = auth.uid())
          );
    `;

    console.log('Running migration to add UPDATE policy...');
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
