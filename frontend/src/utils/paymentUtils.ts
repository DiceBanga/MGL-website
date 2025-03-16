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
  // Create date part
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  const dateStr = `${month}${day}${year}`;
  
  // Process IDs - take first 8 chars without hyphens
  const processId = (id?: string) => id ? id.replace(/-/g, '').slice(0, 8) : '00000000';
  
  const teamIdPart = processId(teamId);
  const captainIdPart = processId(captainId);
  const eventIdPart = processId(eventId);
  const playerIdPart = processId(playerId);
  const requestIdPart = processId(requestId);
  
  // Construct reference ID based on what's available
  if (requestId) {
    // For change requests
    return `${dateStr}-${itemId}-${teamIdPart}-${captainIdPart}-${requestIdPart}`;
  } else if (playerId) {
    // For player-specific operations
    return `${dateStr}-${itemId}-${teamIdPart}-${captainIdPart}-${playerIdPart}`;
  } else if (eventId) {
    // For tournament/league registrations
    return `${dateStr}-${itemId}-${teamIdPart}-${captainIdPart}-${eventIdPart}`;
  } else {
    // Fallback for other payment types
    return `${dateStr}-${itemId}-${teamIdPart}-${captainIdPart}`;
  }
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
  }
): PaymentDetails => {
  const { teamId, eventId, captainId, playersIds, playerId, request_id, item_id } = options;
  
  // Generate reference ID
  const referenceId = generateReferenceId(
    item_id,
    teamId,
    captainId,
    eventId,
    playerId,
    request_id
  );
  
  return {
    id: `payment-${uuidv4()}`,
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
    case 'online_id_change':
      if (!details.teamId) return 'Team ID is required for online ID change';
      if (!details.playerId) return 'Player ID is required for online ID change';
      break;
    case 'team_rebrand':
      if (!details.teamId) return 'Team ID is required for team rebranding';
      if (!details.captainId) return 'Captain ID is required for team rebranding';
      break;
  }
  
  return null;
}; 