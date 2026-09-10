import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:d1c21ab0c6b20953ea3078b1d72abc77@9yzv9szg.ap-southeast.database.insforge.app:5432/insforge?sslmode=require';

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function initDatabase() {
  try {
    const client = await pool.connect();
    try {
      console.log('Connected to InsForge PostgreSQL successfully.');
      
      // Create tables if they do not exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS modules (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'draft',
          kelas VARCHAR(32) NOT NULL,
          semester VARCHAR(32) NOT NULL,
          jurusan VARCHAR(128) NOT NULL,
          topic TEXT NOT NULL,
          gaya_bahasa VARCHAR(32) DEFAULT 'formal',
          template_layout VARCHAR(32) DEFAULT 'lengkap',
          modul_ajar JSONB,
          lkpd JSONB,
          media JSONB,
          asesmen_instrumen JSONB,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );

        -- Ensure columns exist if table was previously created
        ALTER TABLE modules ADD COLUMN IF NOT EXISTS gaya_bahasa VARCHAR(32) DEFAULT 'formal';
        ALTER TABLE modules ADD COLUMN IF NOT EXISTS template_layout VARCHAR(32) DEFAULT 'lengkap';
        ALTER TABLE modules ADD COLUMN IF NOT EXISTS referensi_industri JSONB;
        ALTER TABLE modules ADD COLUMN IF NOT EXISTS catatan_revisi JSONB;

        CREATE INDEX IF NOT EXISTS idx_modules_user_id ON modules(user_id);
        CREATE INDEX IF NOT EXISTS idx_modules_updated_at ON modules(updated_at DESC);

        CREATE TABLE IF NOT EXISTS user_contexts (
          user_id VARCHAR(128) PRIMARY KEY,
          prota TEXT DEFAULT '',
          prosem TEXT DEFAULT '',
          cp_atp TEXT DEFAULT '',
          academic_calendar JSONB,
          updated_at BIGINT NOT NULL
        );
        ALTER TABLE user_contexts ADD COLUMN IF NOT EXISTS academic_calendar JSONB;
      `);
      console.log('Database tables initialized successfully in InsForge.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to initialize InsForge database:', error);
  }
}
