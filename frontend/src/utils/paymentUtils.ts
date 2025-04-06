import { v4 as uuidv4 } from 'uuid';
import type { PaymentDetails } from '../types/payment';

/**
 * Generates a standardized reference ID for payments
 * Format: MMDDYYYY-ITEMID-TEAMID-CAPTAINID-EVENTID
 * Where each ID is truncated to 8 characters with hyphens removed
 */
export const generateReferenceId = (
  itemId: string,
  teamId?: string,
  captainId?: string,
  eventId?: string,
  playerId?: string,
  requestId?: string
): string => {
  // If a request ID is provided, use a shortened version that's Square-compatible
  // Square requires reference_id to be 40 characters or less
  if (requestId) {
    // Remove hyphens from UUID
    const shortRequestId = requestId.replace(/-/g, '');
    // Use the numeric item_id string (e.g., '1003') instead of UUID
    const itemIdPart = itemId.length > 4 ? itemId.slice(0, 4) : itemId;  // Defensive: truncate UUID if passed
    return `${itemIdPart}-${shortRequestId}`;
    // Example: 1003-b8f7d0f2edca44c3bd1fb0a5765b3a2c (37 chars)
  }
  // Fallback if no requestId provided
  return `${itemId}-${uuidv4().replace(/-/g, '')}`;
};

/**
 * Rebuilds original request ID from a shortened reference ID
 * Returns null if the format doesn't match our shortened UUID format
 */
export const extractRequestIdFromReference = (referenceId: string): string | null => {
  // Check if it matches our "itemId-shortRequestId" format
  const parts = referenceId.split('-');
  if (parts.length === 2) {
    const shortRequestId = parts[1];
    
    // If the second part is a 32-character hex string, it's likely our shortened UUID
    if (/^[0-9a-f]{32}$/i.test(shortRequestId)) {
      // Convert back to UUID format
      const uuid = shortRequestId.slice(0, 8) + '-' + 
                   shortRequestId.slice(8, 12) + '-' + 
                   shortRequestId.slice(12, 16) + '-' + 
                   shortRequestId.slice(16, 20) + '-' + 
                   shortRequestId.slice(20);
      return uuid;
    }
  }
  
  return null;
};

/**
 * Creates a standardized payment details object
 */
export const createPaymentDetails = (
  type: PaymentDetails['type'],
  name: string,
  amount: number,
  description: string,
  options: {
    teamId?: string;
    eventId?: string;
    captainId?: string;
    playersIds?: string[];
    playerId?: string;
    request_id?: string;
    item_id: string;
    referenceId?: string; // Allow passing a pre-generated referenceId
  }
): PaymentDetails => {
  const { teamId, eventId, captainId, playersIds, playerId, request_id, item_id } = options;
  
  // Use provided referenceId if available, else generate one
  const referenceId = options.referenceId || generateReferenceId(
    item_id,
    teamId,
    captainId,
    eventId,
    playerId,
    request_id
  );
  console.debug("[PaymentUtils] Generated referenceId:", referenceId);
  
  // Generate a valid UUID for the payment ID
  const paymentId = uuidv4();
  
  return {
    id: paymentId,
    type,
    name,
    amount,
    description,
    teamId,
    eventId,
    captainId,
    playersIds: playersIds || [],
    playerId,
    request_id,
    referenceId,
    item_id
  };
};

/**
 * Validates payment details before submission
 * Returns an error message if validation fails, or null if valid
 */
export const validatePaymentDetails = (details: PaymentDetails): string | null => {
  if (!details.id) return 'Payment ID is required';
  if (!details.type) return 'Payment type is required';
  if (!details.name) return 'Payment name is required';
  if (!details.amount || details.amount <= 0) return 'Valid payment amount is required';
  if (!details.description) return 'Payment description is required';
  if (!details.referenceId) return 'Reference ID is required';
  
  // Type-specific validations
  switch (details.type) {
    case 'tournament':
    case 'league':
      if (!details.teamId) return 'Team ID is required for tournament/league payments';
      if (!details.eventId) return 'Event ID is required for tournament/league payments';
      if (!details.captainId) return 'Captain ID is required for tournament/league payments';
      if (!details.playersIds || details.playersIds.length === 0) {
        return 'Player IDs are required for tournament/league payments';
      }
      break;
    case 'team_transfer':
      if (!details.teamId) return 'Team ID is required for team transfer';
      if (!details.captainId) return 'Captain ID is required for team transfer';
      if (!details.playerId) return 'New captain ID is required for team transfer';
      break;
    case 'roster_change':
      if (!details.teamId) return 'Team ID is required for roster change';
      if (!details.captainId) return 'Captain ID is required for roster change';
      if (!details.playersIds || details.playersIds.length === 0) {
        return 'Player IDs are required for roster change';
      }
      break;
    case 'player_signing':
      if (!details.teamId) return 'Team ID is required for player signing';
      if (!details.captainId) return 'Captain ID is required for player signing';
      break;
    case 'online_id_change':
      if (!details.teamId) return 'Team ID is required for online ID change';
      if (!details.playerId) return 'Player ID is required for online ID change';
      break;
    case 'team_rebrand':
      if (!details.teamId) return 'Team ID is required for team rebranding';
      if (!details.captainId) return 'Captain ID is required for team rebranding';
      break;
  }
  
console.log("Test referenceId:", generateReferenceId("1001", undefined, undefined, undefined, undefined, "b8f7d0f2-edca-44c3-bd1f-b0a5765b3a2c"));
  return null;
}; 