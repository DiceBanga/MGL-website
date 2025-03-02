import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Login() {
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const handleLogin = async (credentials) => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    
    if (!error) {
      // Check if user is owner
      const { data: adminData } = await supabase
        .from('admins')
        .select('is_owner')
        .eq('user_id', supabase.auth.user()?.id)
        .single();

      if (adminData?.is_owner) {
        navigate('/owner');
      } else {
        navigate('/dashboard');
      }
    }
  };

  // Rest of your login component code
} 