import React from 'react';
import { Transition } from '@headlessui/react';
import Modal from './Modal'; // Use the Modal component we just created in the same directory
// We will use standard HTML buttons with Tailwind classes for now

interface EventDetails {
  name?: string;
  rules?: string; // Could be markdown or plain text
  registrationStartDate?: string;
  startDate?: string; // Season Start Date or Tourney Start Date
  playoffStartDate?: string; // Specific to leagues
  registrationFee?: number;
  // Add other relevant fields as needed
}

interface EventRulesModalProps {
  isOpen: boolean;
  eventType: 'league' | 'tournament';
  eventDetails: EventDetails | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const EventRulesModal: React.FC<EventRulesModalProps> = ({
  isOpen,
  eventType,
  eventDetails,
  onConfirm,
  onCancel,
}) => {
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBA';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' // Ensure consistent timezone display
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Invalid Date';
    }
  };

  const title = eventType === 'league' ? 'League Rules & Details' : 'Tournament Rules & Details';
  const startDateLabel = eventType === 'league' ? 'Season Start Date' : 'Tournament Start Date';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="p-6 space-y-4 text-gray-700 dark:text-gray-300">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {eventDetails?.name || 'Event Details'}
        </h3>

        <div className="space-y-2">
          <p><strong>Registration Fee:</strong> {formatCurrency(eventDetails?.registrationFee)}</p>
          <p><strong>Registration Opens:</strong> {formatDate(eventDetails?.registrationStartDate)}</p>
          <p><strong>{startDateLabel}:</strong> {formatDate(eventDetails?.startDate)}</p>
          {eventType === 'league' && eventDetails?.playoffStartDate && (
            <p><strong>Playoffs Start:</strong> {formatDate(eventDetails?.playoffStartDate)}</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Rules</h4>
          {/* Render rules - potentially use a markdown renderer if rules are in markdown */}
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {eventDetails?.rules || 'No rules provided.'}
          </div>
        </div>

        {/* Use standard buttons with Tailwind styling similar to TeamDashboard */}
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EventRulesModal;