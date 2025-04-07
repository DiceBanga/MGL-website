import React from 'react';
import Modal from './Modal'; // Use the Modal component from the same directory

// Assuming Player type is defined elsewhere, e.g., in types/database.ts or similar
// For now, using a basic structure
interface Player {
  id: string;
  username?: string; // Or display_name
  // Add other relevant player fields if needed
}

interface EventDetails {
  name?: string;
  registrationFee?: number;
  // Add other relevant fields as needed
}

interface RegistrationSummaryModalProps {
  isOpen: boolean;
  eventType: 'league' | 'tournament';
  eventDetails: EventDetails | null;
  selectedPlayers: Player[]; // Expecting an array of player objects
  onConfirm: () => void;
  onCancel: () => void;
}

const RegistrationSummaryModal: React.FC<RegistrationSummaryModalProps> = ({
  isOpen,
  eventType,
  eventDetails,
  selectedPlayers,
  onConfirm,
  onCancel,
}) => {
  console.debug("[RegistrationSummaryModal] eventDetails:", eventDetails);
  if (!isOpen || !eventDetails) {
    return null;
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const title = `Confirm ${eventType === 'league' ? 'League' : 'Tournament'} Registration`;
  const eventTypeName = eventType === 'league' ? 'League' : 'Tournament';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="lg">
      <div className="p-6 space-y-4 text-gray-700 dark:text-gray-300">
        <p>Please review the details below before confirming your registration for the <strong>{eventDetails.name || eventTypeName}</strong>.</p>

        {/* Roster Summary */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Selected Roster ({selectedPlayers.length} Players)</h4>
          {selectedPlayers.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {selectedPlayers.map(player => (
                <li key={player.id}>{player.username || `Player ID: ${player.id.substring(0, 8)}`}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No players selected.</p>
          )}
        </div>

        {/* Price Summary */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Registration Fee</h4>
          <p className="text-xl font-semibold text-white">{formatCurrency(eventDetails.registrationFee)}</p>
          <p className="text-xs text-gray-400">Payment will be processed upon confirmation.</p>
        </div>

        {/* Season Info */}
        {eventType === 'league' && eventDetails && 'season' in eventDetails && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Season</h4>
            <p className="text-lg font-semibold text-white">{(eventDetails as any).season || (eventDetails as any).current_season}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
            disabled={selectedPlayers.length < 5} // Example: Disable if roster is incomplete
          >
            Confirm & Proceed to Payment
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RegistrationSummaryModal;