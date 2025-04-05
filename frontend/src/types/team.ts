export interface Team {
  id: string;
  name: string;
  captain_id: string;
  created_at: string;
  updated_at: string;
  logo_url?: string;
  description?: string;
  members?: string[];
} 