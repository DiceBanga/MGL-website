export interface Player {
  id: string;
  name: string;
  team_id?: string;
  avatar_url?: string;
  online_id?: string;
  created_at: string;
  updated_at: string;
  stats?: Record<string, any>;
} 