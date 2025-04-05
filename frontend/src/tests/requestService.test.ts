import { RequestService } from '../services/RequestService';
import { v4 as uuidv4 } from 'uuid';

describe('RequestService - Team Transfer', () => {
  const requestService = new RequestService();
  
  // Test data
  const testData = {
    teamId: 'test-team-id',
    userId: 'test-user-id',
    newCaptainId: 'test-new-captain-id',
    teamName: 'Test Team',
    newCaptainName: 'New Captain',
    itemId: '1002',
    amount: 15
  };

  it('should create a valid team transfer request with payment', async () => {
    // Generate request ID
    const requestId = uuidv4();
    
    // Create payment details
    const paymentDetails = {
      id: uuidv4(),
      type: 'team_transfer',
      name: 'Team Ownership Transfer',
      amount: testData.amount,
      description: `Transfer ownership of ${testData.teamName} to ${testData.newCaptainName}`,
      teamId: testData.teamId,
      captainId: testData.userId,
      playersIds: [],
      playerId: testData.newCaptainId,
      request_id: requestId,
      referenceId: `${testData.itemId}-${requestId.replace(/-/g, '')}`,
      item_id: testData.itemId,
      metadata: {
        requestType: 'team_transfer',
        oldCaptainId: testData.userId,
        oldCaptainName: testData.userId,
        newCaptainId: testData.newCaptainId,
        newCaptainName: testData.newCaptainName,
        teamName: testData.teamName,
        requestId: requestId,
        changeRequestData: {
          teamId: testData.teamId,
          requestedBy: testData.userId,
          itemId: testData.itemId,
          playerId: testData.newCaptainId,
          oldValue: testData.userId,
          newValue: testData.newCaptainId,
          requestId: requestId,
          metadata: {
            oldCaptainName: testData.userId,
            newCaptainName: testData.newCaptainName,
            teamName: testData.teamName,
            requestId: requestId
          }
        }
      }
    };

    // Create request data
    const requestData = {
      request_id: requestId,
      request_type: 'team_transfer' as const,
      team_id: testData.teamId,
      requested_by: testData.userId,
      requires_payment: true,
      new_captain_id: testData.newCaptainId,
      old_captain_id: testData.userId,
      item_id: testData.itemId,
      payment_data: paymentDetails
    };

    // Mock fetch response
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );

    // Process request
    const result = await requestService.processRequest(requestData);

    // Verify request was processed
    expect(result.success).toBe(true);
    
    // Verify fetch was called with correct data
    expect(fetch).toHaveBeenCalledWith(
      '/api/team/transfer',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
    );
  });

  it('should validate required fields', async () => {
    const invalidRequest = {
      request_type: 'team_transfer' as const,
      team_id: testData.teamId,
      requested_by: testData.userId,
      requires_payment: true,
      // Missing new_captain_id and item_id
    };

    await expect(requestService.processRequest(invalidRequest as any))
      .rejects
      .toThrow('Missing required fields');
  });
}); 