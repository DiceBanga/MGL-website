import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250227054341_bright_mud.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration...');
    const { error } = await supabase.rpc('pgmigrate', { query: sql });
    
    if (error) {
      throw error;
    }
    
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();