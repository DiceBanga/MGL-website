// frontend/src/services/RequestService.ts

import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { PaymentDetails } from '../types/payment';

export type RequestType = 
  | 'team_transfer'
  | 'roster_change'
  | 'tournament_registration'
  | 'league_registration'
  | 'team_rebrand'
  | 'online_id_change'
  | 'team_creation';

export interface RequestBase {
  request_id?: string;
  request_type: RequestType;
  team_id: string;
  requested_by: string;
  requires_payment: boolean;
  metadata?: Record<string, any>;
}

export interface TeamTransferRequest extends RequestBase {
  request_type: 'team_transfer';
  new_captain_id: string;
  old_captain_id: string;
  payment_data?: any;
}

export interface RosterChangeRequest extends RequestBase {
  request_type: 'roster_change';
  player_id: string;
  new_role?: string;
  operation: 'add' | 'remove' | 'update';
  payment_data?: any;
}

export interface TournamentRegistrationRequest extends RequestBase {
  request_type: 'tournament_registration';
  tournament_id: string;
  player_ids: string[];
  payment_data?: any;
}

export interface LeagueRegistrationRequest extends RequestBase {
  request_type: 'league_registration';
  league_id: string;
  season?: number;
  player_ids: string[];
  payment_data?: any;
}

export interface TeamRebrandRequest extends RequestBase {
  request_type: 'team_rebrand';
  old_name: string;
  new_name: string;
  payment_data?: any;
}

export interface OnlineIdChangeRequest extends RequestBase {
  request_type: 'online_id_change';
  player_id: string;
  old_online_id?: string;
  new_online_id: string;
  platform: string;
  payment_data?: any;
}

export interface TeamCreationRequest extends RequestBase {
  request_type: 'team_creation';
  team_name: string;
  captain_id: string;
  league_id?: string;
  payment_data?: any;
}

export type RequestData = 
  | TeamTransferRequest
  | RosterChangeRequest
  | TournamentRegistrationRequest
  | LeagueRegistrationRequest
  | TeamRebrandRequest
  | OnlineIdChangeRequest
  | TeamCreationRequest;

export class RequestService {
  private apiUrl = '/api';
  
  async processRequest(requestData: RequestData): Promise<any> {
    try {
      // Generate request ID if not provided
      if (!requestData.request_id) {
        requestData.request_id = uuidv4();
      }
      
      console.log(`Processing ${requestData.request_type} request with ID: ${requestData.request_id}`);
      
      // Map request type to endpoint
      const endpoints = {
        'team_transfer': '/team/transfer',
        'roster_change': '/team/roster',
        'tournament_registration': '/tournament/register',
        'league_registration': '/league/register',
        'team_rebrand': '/team/rebrand',
        'online_id_change': '/team/online-id',
        'team_creation': '/team/create'
      };
      
      const endpoint = endpoints[requestData.request_type];
      
      if (!endpoint) {
        throw new Error(`Unknown request type: ${requestData.request_type}`);
      }
      
      // Call the API endpoint
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process request');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Request processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request'
      };
    }
  }
  
  async getRequest(requestId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/requests/${requestId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get request');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting request:', error);
      return null;
    }
  }
  
  async getTeamRequests(teamId: string, status?: string): Promise<any[]> {
    try {
      // Use Supabase client for direct database access
      let query = supabase
        .from('team_change_requests')
        .select('*')
        .eq('team_id', teamId);
        
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting team requests:', error);
      return [];
    }
  }
}