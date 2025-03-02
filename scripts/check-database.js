import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  try {
    // Check tournament table constraints
    console.log('Checking tournament table constraints...');
    const { data: constraints, error: constraintsError } = await supabase.rpc('pgmigrate', { 
      query: `
        SELECT conname, pg_get_constraintdef(oid) as constraint_def
        FROM pg_constraint
        WHERE conrelid = 'tournaments'::regclass
        AND contype = 'c';
      `
    });
    
    if (constraintsError) {
      throw constraintsError;
    }
    
    console.log('Tournament table constraints:');
    console.log(constraints);
    
    // Check tournament status values in the database
    console.log('\nChecking existing tournament status values...');
    const { data: statuses, error: statusesError } = await supabase
      .from('tournaments')
      .select('id, name, status')
      .order('name');
    
    if (statusesError) {
      throw statusesError;
    }
    
    console.log('Current tournament statuses:');
    console.log(statuses);
    
    // Try to update a tournament to have status 'registration'
    console.log('\nTrying to update a tournament to status "registration"...');
    if (statuses && statuses.length > 0) {
      const firstTournament = statuses[0];
      const { data: updateResult, error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'registration' })
        .eq('id', firstTournament.id)
        .select();
      
      if (updateError) {
        console.error('Error updating tournament status:');
        console.error(updateError);
      } else {
        console.log('Successfully updated tournament:');
        console.log(updateResult);
      }
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase();