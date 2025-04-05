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
  item_id: string;
  payment_data?: PaymentDetails;
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
  payment_data?: {
    amount: number;
    metadata: {
      request_id: string;
      request_type: string;
      team_id: string;
      old_name: string;
      new_name: string;
      logo_url?: string;
    }
  };
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
  private defaultItemIds = {
    team_transfer: '1002',
    team_rebrand: '1003',
    // Add other default item IDs here
  };

  // Request builders
  public createTeamTransferRequest(params: {
    teamId: string;
    userId: string;
    newCaptainId: string;
    teamName: string;
    newCaptainName: string;
    amount: number;
  }): TeamTransferRequest {
    const requestId = uuidv4();
    const itemId = this.defaultItemIds.team_transfer;

    const paymentDetails: PaymentDetails = {
      id: uuidv4(),
      type: 'team_transfer',
      name: 'Team Ownership Transfer',
      amount: params.amount,
      description: `Transfer ownership of ${params.teamName} to ${params.newCaptainName}`,
      teamId: params.teamId,
      captainId: params.userId,
      playersIds: [],
      playerId: params.newCaptainId,
      request_id: requestId,
      referenceId: `${itemId}-${requestId.replace(/-/g, '')}`,
      item_id: itemId,
      metadata: {
        requestType: 'team_transfer',
        oldCaptainId: params.userId,
        oldCaptainName: params.userId,
        newCaptainId: params.newCaptainId,
        newCaptainName: params.newCaptainName,
        teamName: params.teamName,
        requestId: requestId,
        changeRequestData: {
          teamId: params.teamId,
          requestedBy: params.userId,
          itemId: itemId,
          playerId: params.newCaptainId,
          oldValue: params.userId,
          newValue: params.newCaptainId,
          requestId: requestId,
          metadata: {
            oldCaptainName: params.userId,
            newCaptainName: params.newCaptainName,
            teamName: params.teamName,
            requestId: requestId
          }
        }
      }
    };

    return {
      request_id: requestId,
      request_type: 'team_transfer',
      team_id: params.teamId,
      requested_by: params.userId,
      requires_payment: true,
      new_captain_id: params.newCaptainId,
      old_captain_id: params.userId,
      item_id: itemId,
      payment_data: paymentDetails
    };
  }

  // Validation methods
  private validateTeamTransferRequest(request: TeamTransferRequest): void {
    if (!request.team_id) throw new Error('Missing required field: team_id');
    if (!request.requested_by) throw new Error('Missing required field: requested_by');
    if (!request.new_captain_id) throw new Error('Missing required field: new_captain_id');
    if (!request.old_captain_id) throw new Error('Missing required field: old_captain_id');
    if (!request.item_id) throw new Error('Missing required field: item_id');

    if (request.requires_payment && !request.payment_data) {
      throw new Error('Payment data required for paid requests');
    }
  }

  private validateRequest(request: RequestData): void {
    switch (request.request_type) {
      case 'team_transfer':
        this.validateTeamTransferRequest(request);
        break;
      // Add other request type validations here
    }
  }

  // Process request with error handling and status tracking
  async processRequest(requestData: RequestData): Promise<any> {
    try {
      // Ensure request has an ID
      if (!requestData.request_id) {
        requestData.request_id = uuidv4();
      }
      
      console.log(`Processing ${requestData.request_type} request with ID: ${requestData.request_id}`);
      
      // Validate request data
      this.validateRequest(requestData);
      
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
      
      // Track request status
      await this.updateRequestStatus(requestData.request_id, 'processing');
      
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
        await this.updateRequestStatus(requestData.request_id, 'failed', errorData);
        throw new Error(errorData.detail || 'Failed to process request');
      }
      
      const result = await response.json();
      await this.updateRequestStatus(requestData.request_id, 'pending');
      
      return result;
    } catch (error) {
      console.error('Request processing error:', error);
      if (requestData.request_id) {
        await this.updateRequestStatus(requestData.request_id, 'failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      throw error;
    }
  }

  // Status tracking
  private async updateRequestStatus(requestId: string, status: string, metadata?: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_change_requests')
        .update({
          status,
          metadata: metadata ? { ...metadata, updated_at: new Date().toISOString() } : undefined
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating request status:', error);
      }
    } catch (error) {
      console.error('Error updating request status:', error);
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
  // Method to fetch detailed tournament info
  async fetchTournamentDetails(tournamentId: string): Promise<any> {
    console.log(`Fetching details for tournament ID: ${tournamentId}`);
    try {
      // Assuming backend endpoint GET /api/tournaments/{tournamentId} exists
      const response = await fetch(`${this.apiUrl}/tournaments/${tournamentId}`);
      if (!response.ok) {
        // Attempt to parse error details from backend if available
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetails = errorData.detail || errorDetails;
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(`Failed to fetch tournament details: ${errorDetails}`);
      }
      const data = await response.json();
      console.log("Tournament details fetched:", data);
      // TODO: Add validation here to ensure data matches expected structure
      return data;
    } catch (error) {
      console.error('Error in fetchTournamentDetails:', error);
      throw error; // Re-throw to be handled by the calling component
    }
  }

  // Method to fetch detailed league info
  async fetchLeagueDetails(leagueId: string): Promise<any> {
    console.log(`Fetching details for league ID: ${leagueId}`);
    try {
      // Assuming backend endpoint GET /api/leagues/{leagueId} exists
      const response = await fetch(`${this.apiUrl}/leagues/${leagueId}`);
      if (!response.ok) {
         // Attempt to parse error details from backend if available
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetails = errorData.detail || errorDetails;
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(`Failed to fetch league details: ${errorDetails}`);
      }
      const data = await response.json();
      console.log("League details fetched:", data);
      // TODO: Add validation here to ensure data matches expected structure
      return data;
    } catch (error) {
      console.error('Error in fetchLeagueDetails:', error);
      throw error; // Re-throw to be handled by the calling component
    }
  }
}