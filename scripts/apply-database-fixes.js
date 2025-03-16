#!/usr/bin/env node

/**
 * Database Schema Fix Application Script
 * 
 * This script applies the database schema fixes migration and validates the results.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration
const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20240401000000_database_schema_fixes.sql');
const VALIDATION_SCRIPT = path.join(__dirname, './validate-database-schema.js');

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Apply migration using Supabase CLI
function applyMigrationWithCLI() {
  console.log('Applying migration with Supabase CLI...');
  try {
    execSync('supabase db reset', { stdio: 'inherit' });
    console.log('✅ Migration applied successfully with Supabase CLI');
    return true;
  } catch (error) {
    console.error('❌ Failed to apply migration with Supabase CLI:', error.message);
    return false;
  }
}

// Apply migration using psql
function applyMigrationWithPsql() {
  console.log('Applying migration with psql...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    return false;
  }
  
  try {
    execSync(`psql "${dbUrl}" -f "${MIGRATION_FILE}"`, { stdio: 'inherit' });
    console.log('✅ Migration applied successfully with psql');
    return true;
  } catch (error) {
    console.error('❌ Failed to apply migration with psql:', error.message);
    return false;
  }
}

// Apply migration using Supabase JS client
async function applyMigrationWithSupabaseJS() {
  console.log('Applying migration with Supabase JS client...');
  
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase environment variables not set');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    const { error } = await supabase.rpc('pgmigrate', { query: sql });
    
    if (error) {
      console.error('❌ Failed to apply migration with Supabase JS:', error.message);
      return false;
    }
    
    console.log('✅ Migration applied successfully with Supabase JS');
    return true;
  } catch (error) {
    console.error('❌ Failed to apply migration with Supabase JS:', error.message);
    return false;
  }
}

// Validate schema after migration
function validateSchema() {
  console.log('\nValidating schema after migration...');
  try {
    execSync(`node "${VALIDATION_SCRIPT}"`, { stdio: 'inherit' });
    console.log('✅ Schema validation passed');
    return true;
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Database Schema Fix Application ===\n');
  
  // Check if migration file exists
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }
  
  // Try different methods to apply migration
  let success = false;
  
  if (checkSupabaseCLI()) {
    success = applyMigrationWithCLI();
  }
  
  if (!success) {
    success = applyMigrationWithPsql();
  }
  
  if (!success) {
    success = await applyMigrationWithSupabaseJS();
  }
  
  if (!success) {
    console.error('❌ Failed to apply migration using any available method');
    process.exit(1);
  }
  
  // Validate schema
  const validationSuccess = validateSchema();
  
  if (!validationSuccess) {
    console.error('❌ Schema validation failed after migration');
    process.exit(1);
  }
  
  console.log('\n✅ Database schema fixes applied and validated successfully!');
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 