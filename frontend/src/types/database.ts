/**
 * Database Types
 * 
 * This file contains TypeScript interfaces that match the database schema.
 * These types should be used for all database interactions to ensure type safety.
 */

import { PostgrestError } from '@supabase/supabase-js';

/**
 * Database result types
 */
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;
export type DbResultErr = PostgrestError;

/**
 * Player related types
 */
export interface DbPlayer {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  online_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Team related types
 */
export interface DbTeam {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  email: string | null;
  captain_id: string;
  team_tag: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Team member with player information
 */
export interface DbTeamMember {
  team_id: string;
  user_id: string;
  role: string;
  jersey_number: number | null;
  can_be_deleted: boolean;
  created_at: string;
  updated_at: string;
  players: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Join request with player information
 */
export interface DbJoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  players: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Game related types
 */
export interface DbGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduled_at: string;
  created_at: string;
  updated_at: string;
  home_team?: {
    name: string;
    logo_url?: string | null;
  };
  away_team?: {
    name: string;
    logo_url?: string | null;
  };
}

/**
 * Tournament related types
 */
export interface DbTournament {
  id: string;
  name: string;
  description: string | null;
  status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  prize_pool: number;
  payment_amount: number;
  created_at: string;
  updated_at: string;
}

/**
 * League related types
 */
export interface DbLeague {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived' | 'registration';
  current_season: number;
  prize_pool: number;
  payment_amount: number;
  created_at: string;
  updated_at: string;
}

/**
 * Tournament registration related types
 */
export interface DbTournamentRegistration {
  id: string;
  team_id: string;
  tournament_id: string;
  status: string;
  registration_date: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  tournaments: {
    name: string;
  };
}

/**
 * League registration related types
 */
export interface DbLeagueRegistration {
  id: string;
  team_id: string;
  league_id: string;
  status: string;
  registration_date: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  leagues: {
    name: string;
  };
}

/**
 * Tournament roster related types
 */
export interface DbTournamentRoster {
  id: string;
  tournament_registration_id: string;
  player_id: string;
  created_at: string;
  updated_at: string;
  players: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * League roster related types
 */
export interface DbLeagueRoster {
  id: string;
  league_registration_id: string;
  player_id: string;
  created_at: string;
  updated_at: string;
  players: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Payment related types
 */
export interface DbPayment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'processing';
  description: string | null;
  metadata: Record<string, any> | null;
  payment_details: Record<string, any> | null;
  payment_id: string | null;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Item related types
 */
export interface DbItem {
  id: string;
  item_name: string;
  item_id: string;
  item_description: string | null;
  reg_price: number;
  current_price: number;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Team change request related types
 */
export interface DbTeamChangeRequest {
  id: string;
  team_id: string;
  request_type: 'roster_change' | 'online_id_change' | 'team_rebrand' | 'team_transfer';
  requested_by: string;
  tournament_id: string | null;
  league_id: string | null;
  player_id: string | null;
  old_value: string | null;
  new_value: string | null;
  item_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
} 