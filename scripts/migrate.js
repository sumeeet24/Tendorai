require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Prefer non-pooling for migrations
let connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Environment variables for database connection are missing.');
  process.exit(1);
}

// Remove sslmode query param to avoid conflicts with ssl config object
connectionString = connectionString.replace(/[?&]sslmode=[^&]+/, '');
// Also remove empty ? or & at end if any, or if it was the only param
if (connectionString.endsWith('?')) connectionString = connectionString.slice(0, -1);

console.log(`Connecting to database...`);

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

    const sqlPath = path.join(__dirname, '../migrations/schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
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
