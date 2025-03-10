import { PostgrestError } from '@supabase/supabase-js'

export interface Tables {
  players: {
    id: string
    created_at: string
    // Add other player fields
  }
  admins: {
    id: string
    created_at: string
    user_id: string
    is_owner: boolean
    // Add other admin fields
  }
  sponsors: {
    id: string
    created_at: string
    // Add other sponsor fields
  }
  tournaments: {
    id: string
    created_at: string
    // Add other tournament fields
  }
  games: {
    id: string
    created_at: string
    // Add other game fields
  }
}

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

export type Database = {
  public: {
    Tables: Tables
  }
}