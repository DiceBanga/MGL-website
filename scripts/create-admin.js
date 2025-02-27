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

async function createAdminUser() {
  try {
    // Create the user with email and password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'dice.banga@gmail.com',
      password: 'militia',
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No user data returned');
    }

    console.log('User created successfully:', authData.user.id);

    // Set the user's role to admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authData.user.id,
      { user_metadata: { role: 'admin' } }
    );

    if (updateError) {
      throw updateError;
    }

    // Create player profile
    const { error: profileError } = await supabase
      .from('players')
      .insert({
        user_id: authData.user.id,
        display_name: 'Admin',
        email: 'dice.banga@gmail.com',
        role: 'admin'
      });

    if (profileError) {
      throw profileError;
    }

    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();