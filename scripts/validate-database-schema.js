#!/usr/bin/env node

/**
 * Database Schema Validation Script
 * 
 * This script validates the database schema after applying migrations.
 * It checks for:
 * - Required tables and columns
 * - Foreign key relationships
 * - Constraints
 * - Indexes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define expected schema
const expectedTables = [
  'players',
  'teams',
  'tournaments',
  'leagues',
  'team_players',
  'tournament_registrations',
  'league_registrations',
  'payments',
  'items'
];

const expectedColumns = {
  'payments': [
    'id', 'user_id', 'amount', 'currency', 'payment_method', 'status', 
    'description', 'metadata', 'created_at', 'updated_at', 
    'payment_details', 'payment_id', 'reference_id'
  ],
  'items': [
    'id', 'item_name', 'item_id', 'item_description', 'reg_price', 
    'current_price', 'created_at', 'updated_at', 'metadata'
  ],
  'tournaments': [
    'id', 'name', 'description', 'status', 'start_date', 'end_date', 
    'prize_pool', 'payment_amount'
  ],
  'leagues': [
    'id', 'name', 'description', 'status', 'current_season', 
    'prize_pool', 'payment_amount'
  ]
};

const expectedConstraints = [
  { table: 'payments', constraint: 'payments_status_check' },
  { table: 'items', constraint: 'items_item_id_format_check' },
  { table: 'tournaments', constraint: 'tournaments_status_check' },
  { table: 'leagues', constraint: 'leagues_status_check' },
  { table: 'tournament_registrations', constraint: 'tournament_registrations_payment_status_check' },
  { table: 'league_registrations', constraint: 'league_registrations_payment_status_check' }
];

const expectedIndexes = [
  { table: 'payments', index: 'idx_payments_reference_id' },
  { table: 'payments', index: 'idx_payments_metadata' },
  { table: 'payments', index: 'idx_payments_user_id' },
  { table: 'payments', index: 'idx_payments_status' },
  { table: 'payments', index: 'idx_payments_created_at' },
  { table: 'players', index: 'idx_players_display_name' },
  { table: 'teams', index: 'idx_teams_name' },
  { table: 'tournaments', index: 'idx_tournaments_name' },
  { table: 'leagues', index: 'idx_leagues_name' },
  { table: 'tournaments', index: 'idx_tournaments_status' },
  { table: 'leagues', index: 'idx_leagues_status' },
  { table: 'tournament_registrations', index: 'idx_tournament_registrations_status' },
  { table: 'league_registrations', index: 'idx_league_registrations_status' },
  { table: 'tournament_registrations', index: 'idx_tournament_registrations_team_tournament' },
  { table: 'league_registrations', index: 'idx_league_registrations_team_league' },
  { table: 'team_players', index: 'idx_team_players_team_role' }
];

const expectedForeignKeys = [
  { table: 'team_players', constraint: 'team_players_user_id_fkey', references: 'players(user_id)' },
  { table: 'teams', constraint: 'teams_captain_id_fkey', references: 'players(user_id)' },
  { table: 'tournament_registrations', constraint: 'tournament_registrations_team_id_fkey', references: 'teams(id)' },
  { table: 'tournament_registrations', constraint: 'tournament_registrations_tournament_id_fkey', references: 'tournaments(id)' },
  { table: 'league_registrations', constraint: 'league_registrations_team_id_fkey', references: 'teams(id)' },
  { table: 'league_registrations', constraint: 'league_registrations_league_id_fkey', references: 'leagues(id)' }
];

// Create a temporary SQL file for validation queries
const createValidationSql = () => {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  const sqlFilePath = path.join(tempDir, 'validate_schema.sql');
  
  let sqlContent = `
-- Validation SQL Script
\\echo 'Validating database schema...';

-- Check tables
\\echo '\\nChecking tables...';
`;

  expectedTables.forEach(table => {
    sqlContent += `
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = '${table}'
) AS "${table}_exists";
`;
  });

  sqlContent += `
-- Check columns
\\echo '\\nChecking columns...';
`;

  Object.entries(expectedColumns).forEach(([table, columns]) => {
    columns.forEach(column => {
      sqlContent += `
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = '${table}'
  AND column_name = '${column}'
) AS "${table}_${column}_exists";
`;
    });
  });

  sqlContent += `
-- Check constraints
\\echo '\\nChecking constraints...';
`;

  expectedConstraints.forEach(({ table, constraint }) => {
    sqlContent += `
SELECT EXISTS (
  SELECT FROM information_schema.constraint_column_usage
  WHERE table_schema = 'public' 
  AND table_name = '${table}'
  AND constraint_name = '${constraint}'
) AS "${constraint}_exists";
`;
  });

  sqlContent += `
-- Check indexes
\\echo '\\nChecking indexes...';
`;

  expectedIndexes.forEach(({ table, index }) => {
    sqlContent += `
SELECT EXISTS (
  SELECT FROM pg_indexes
  WHERE schemaname = 'public' 
  AND tablename = '${table}'
  AND indexname = '${index}'
) AS "${index}_exists";
`;
  });

  sqlContent += `
-- Check foreign keys
\\echo '\\nChecking foreign keys...';
`;

  expectedForeignKeys.forEach(({ table, constraint }) => {
    sqlContent += `
SELECT EXISTS (
  SELECT FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_schema = ccu.constraint_schema
    AND tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = '${table}'
  AND tc.constraint_name = '${constraint}'
) AS "${constraint}_exists";
`;
  });

  fs.writeFileSync(sqlFilePath, sqlContent);
  return sqlFilePath;
};

// Run validation using psql
const validateSchema = () => {
  console.log('Validating database schema...');
  
  const sqlFilePath = createValidationSql();
  
  try {
    // Try to use supabase CLI first
    try {
      console.log('Attempting validation with Supabase CLI...');
      execSync(`supabase db execute --file ${sqlFilePath}`, { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.log('Supabase CLI validation failed, trying direct psql...');
    }
    
    // Fall back to direct psql if available
    try {
      execSync(`psql -f ${sqlFilePath}`, { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.error('Direct psql validation failed:', error.message);
    }
    
    console.error('❌ Schema validation failed. Could not connect to database.');
    return false;
  } catch (error) {
    console.error('Validation script error:', error.message);
    return false;
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(sqlFilePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
};

// Run validation
const success = validateSchema();
process.exit(success ? 0 : 1); 