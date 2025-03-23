import { supabase } from '../supabaseClient';
import { PaymentService } from './PaymentService';
import { v4 as uuidv4 } from 'uuid';

export class RequestService {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Initiates a new request and begins the payment process
   */
  async initiateRequest(requestData: any) {
    try {
      // Step 1: Insert the request record with status 'pending'
      const { data: requestRecord, error: insertError } = await supabase
        .from('team_change_requests')
        .insert([
          {
            id: requestData.request_id,
            type: requestData.request_type,
            team_id: requestData.team_id,
            user_id: requestData.user_id,
            status: 'pending',
            metadata: requestData.action_data
          }
        ])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating request record:', insertError);
        return { success: false, error: 'Failed to create request record' };
      }
      
      // Step 2: Initialize the payment using the payment service
      const paymentResult = await this.paymentService.initializePayment(
        requestData.payment_data
      );
      
      if (!paymentResult.success) {
        return { 
          success: false, 
          error: paymentResult.error || 'Payment initialization failed' 
        };
      }
      
      // Return successful result with payment details
      return {
        success: true,
        request: requestRecord,
        paymentDetails: paymentResult.paymentDetails
      };
      
    } catch (error) {
      console.error('Request service error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Process a request after payment is completed
   */
  async processRequest(requestId: string, paymentId: string) {
    try {
      // First, update the request record with the payment ID
      const { error: updateError } = await supabase
        .from('team_change_requests')
        .update({
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (updateError) {
        console.error('Error updating request with payment ID:', updateError);
        return { success: false, error: 'Failed to update request with payment info' };
      }
      
      // Call the backend API to process the request
      const response = await fetch('/api/requests/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          payment_id: paymentId
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.detail || 'Failed to process request' };
      }
      
      return { success: true, result };
      
    } catch (error) {
      console.error('Error processing request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get requests for a specific team
   */
  async getTeamRequests(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('team_change_requests')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching team requests:', error);
        return { success: false, error: 'Failed to fetch team requests' };
      }
      
      return { success: true, requests: data };
      
    } catch (error) {
      console.error('Error in getTeamRequests:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
} 