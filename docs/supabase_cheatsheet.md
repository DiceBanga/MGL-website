# Supabase CLI Cheatsheet

## Installation

```powershell
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

## Authentication

```powershell
# Login to Supabase
supabase login

# Set project API keys (alternative to login)
$env:SUPABASE_URL = "your-project-url"
$env:SUPABASE_KEY = "your-api-key" # use service_role key for admin access
```

## Project Management

```powershell
# Initialize a new project
supabase init

# Start the local development server
supabase start

# Stop the local development server
supabase stop

# Link to an existing project
supabase link --project-ref your-project-ref
```

## Database Operations

### Direct SQL Queries

```powershell
# Run SQL query on local development instance
supabase db query "SELECT * FROM your_table LIMIT 10"

# Run SQL query on remote project
supabase db query "SELECT * FROM your_table LIMIT 10" --db-url "postgresql://postgres:postgres@localhost:54322/postgres"

# Run SQL file
supabase db query -f "./path/to/query.sql"
```

### Schema Management

```powershell
# Create a new migration
supabase migration new my_migration_name

# Apply migrations
supabase db push

# Get current database schema
supabase db dump -f schema.sql --schema-only
```

## Using psql Directly (Alternative)

```powershell
# Install PostgreSQL client (if not already installed)
# https://www.postgresql.org/download/windows/

# Connect to local Supabase database
psql "postgresql://postgres:postgres@localhost:54322/postgres"

# Connect to remote Supabase database
psql "postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Basic psql commands
\dt             # List tables
\d table_name   # Describe table
\q              # Quit
```

## JavaScript/Node.js Approach

Create a file called `query-db.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin access

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryDatabase() {
  // Example: Query with SQL
  const { data, error } = await supabase.rpc('pgmigrate', { 
    query: `SELECT * FROM your_table LIMIT 10;`
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Results:', data);
  
  // Example: Using the Supabase query builder
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .limit(10);
    
  if (teamsError) {
    console.error('Teams error:', teamsError);
    return;
  }
  
  console.log('Teams:', teams);
}

queryDatabase();
```

Run with:
```powershell
node query-db.js
```

## Python Approach

Create a file called `query_db.py`:

```python
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for admin access

supabase = create_client(supabase_url, supabase_key)

# Example: Using the Supabase query builder
response = supabase.table('your_table').select('*').limit(10).execute()
print("Results:", response.data)

# Example: Executing raw SQL (requires proper extension setup)
# response = supabase.rpc('pgmigrate', {'query': 'SELECT * FROM your_table LIMIT 10;'}).execute()
# print("SQL Results:", response.data)
```

Run with:
```powershell
python query_db.py
```

## Common SQL Queries

```sql
-- Select all records from a table
SELECT * FROM table_name;

-- Insert a new record
INSERT INTO table_name (column1, column2)
VALUES ('value1', 'value2')
RETURNING *;

-- Update records
UPDATE table_name
SET column1 = 'new_value'
WHERE condition
RETURNING *;

-- Delete records
DELETE FROM table_name
WHERE condition
RETURNING *;

-- Join example
SELECT t.name, u.email
FROM teams t
JOIN users u ON t.captain_id = u.id
WHERE t.active = true;
```

## Troubleshooting

- **Connection issues**: Verify your URL and API key are correct
- **Permission denied**: Check your RLS (Row Level Security) policies
- **JWT token expired**: Re-login or refresh your token
- **Database version mismatch**: Ensure your local tools match Supabase's PostgreSQL version