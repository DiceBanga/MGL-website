# Database Schema Fixes

This document provides information about the database schema fixes implemented in the MGL Website project.

## Overview

The database schema fixes address various inconsistencies and issues in the database schema, including:

1. **Payments Table Fixes**
   - Standardized payment_details column
   - Added missing indexes
   - Fixed constraint inconsistencies

2. **Foreign Key Relationship Fixes**
   - Ensured proper relationships between tables
   - Added missing foreign keys
   - Fixed ON DELETE behavior

3. **Constraint Standardization**
   - Standardized constraint naming conventions
   - Fixed inconsistent validation rules
   - Ensured all tables have proper constraints

4. **Index Optimization**
   - Added missing indexes for frequently queried fields
   - Optimized existing indexes
   - Removed redundant indexes

## Implementation

The fixes are implemented as a comprehensive migration script located at:
```
supabase/migrations/20240401000000_database_schema_fixes.sql
```

This script uses conditional logic to ensure it can be applied safely to existing databases without data loss.

## Applying the Fixes

You can apply the database schema fixes using one of the following methods:

### Using npm scripts

```bash
# Apply the fixes
npm run db:fix

# Validate the schema after applying fixes
npm run db:validate
```

### Using Supabase CLI

```bash
supabase db reset
```

### Using psql directly

```bash
psql "postgresql://postgres:postgres@localhost:5432/postgres" -f supabase/migrations/20240401000000_database_schema_fixes.sql
```

## Validation

After applying the fixes, you can validate the database schema using:

```bash
npm run db:validate
```

This script checks for:
- Required tables and columns
- Foreign key relationships
- Constraints
- Indexes

## Documentation

For a complete overview of the database schema, refer to the [Database Schema Documentation](./database-schema.md).

## Troubleshooting

If you encounter issues when applying the fixes:

1. **Migration fails to apply**
   - Check if you have the necessary permissions to modify the database
   - Ensure your database connection is properly configured
   - Look for error messages in the console output

2. **Validation fails after migration**
   - Check which specific checks are failing
   - Manually verify the database structure using a database client
   - Try running the migration script again

3. **Application errors after migration**
   - Check if your application code is compatible with the updated schema
   - Update any code that relies on the old schema structure
   - Test thoroughly before deploying to production

## Next Steps

After applying these database schema fixes, consider:

1. Updating your application code to use the standardized schema
2. Adding comprehensive tests for database operations
3. Implementing a regular database maintenance schedule
4. Documenting any future schema changes thoroughly 