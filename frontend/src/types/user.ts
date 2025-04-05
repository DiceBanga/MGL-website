export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  role?: 'admin' | 'user';
  teams?: string[];
} 