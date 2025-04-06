import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Assuming supabase client is here
import { AlertCircle, CheckCircle } from 'lucide-react';

// Assuming DbTeamMember and related types are defined, potentially in types/database.ts
// Interface reflecting the structure returned by the Supabase query
interface Player {
  user_id: string; // From team_players
  role?: string;
  jersey_number?: number | null;
  created_at?: string;
  can_be_deleted?: boolean;
  players: { // Nested object from the players table join
    user_id: string; // From players table
    display_name?: string;
    avatar_url?: string | null;
    online_id?: string | null;
  } | null; // The join might return null if no matching player exists
}

interface EventDetails {
  name?: string;
  // Add other relevant fields as needed
}

interface PlayerSelectionFormProps {
  eventType: 'league' | 'tournament';
  eventDetails: EventDetails | null;
  teamId: string;
  onRosterComplete: (selectedPlayerIds: string[]) => void;
  onCancel: () => void; // Add a cancel callback
}

const PlayerSelectionForm: React.FC<PlayerSelectionFormProps> = ({
  eventType,
  eventDetails,
  teamId,
  onRosterComplete,
  onCancel,
}) => {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requiredPlayers = 5; // Standard roster size

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch current team members - assuming these are the "free agents" for selection
        // Fetch team players with nested player details, including all team_players fields
        const { data: membersData, error: membersError } = await supabase
          .from('team_players')
          .select(`
            user_id,
            role,
            jersey_number,
            created_at,
            can_be_deleted,
            players (
              user_id,
              display_name,
              avatar_url,
              email
            )
          `)
          .eq('team_id', teamId);

        if (membersError) throw membersError;

        // Explicitly map and validate the structure after fetching
        const mappedPlayers = (membersData || [])
          .map((member: any): Player | null => { // Explicitly type the map return
            // Ensure the nested 'players' is treated as an object and exists
            const playerData = member.players && !Array.isArray(member.players) ? member.players : null;

            // Check if the essential nested player data exists
            if (playerData && playerData.user_id && member.user_id) {
              // Construct the object matching the Player interface, handling optional fields
              const playerObject: Player = {
                user_id: member.user_id, // Required
                role: member.role ?? undefined, // Use nullish coalescing for optional fields
                jersey_number: member.jersey_number ?? null,
                created_at: member.created_at ?? undefined,
                can_be_deleted: member.can_be_deleted ?? undefined,
                players: { // Assign the validated nested object
                  user_id: playerData.user_id, // Required
                  display_name: playerData.display_name ?? undefined,
                  avatar_url: playerData.avatar_url ?? null,
                  online_id: playerData.online_id ?? null,
                }
              };
              return playerObject;
            }
            return null; // Return null if the structure is not as expected
          })
          .filter((p): p is Player => p !== null); // Filter out the null entries

        // Now mappedPlayers is correctly typed as Player[]
        setAvailablePlayers(mappedPlayers);

      } catch (err: any) {
        console.error("Error fetching team players:", err);
        setError(`Failed to load players: ${err.message}`);
        setAvailablePlayers([]);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchPlayers();
    }
  }, [teamId]);

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerIds(prevSelected => {
      if (prevSelected.includes(playerId)) {
        // Deselect
        return prevSelected.filter(id => id !== playerId);
      } else {
        // Select, but only if less than required players are selected
        if (prevSelected.length < requiredPlayers) {
          return [...prevSelected, playerId];
        }
        return prevSelected; // Max players reached, do not add more
      }
    });
  };

  const handleContinue = () => {
    if (selectedPlayerIds.length === requiredPlayers) {
      onRosterComplete(selectedPlayerIds);
    } else {
      // Should ideally not happen if button is disabled, but good to have a check
      setError(`Please select exactly ${requiredPlayers} players.`);
    }
  };

  const eventTypeName = eventType === 'league' ? 'League' : 'Tournament';

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white">
      <h2 className="text-xl font-bold mb-2">Select Roster for {eventDetails?.name || eventTypeName}</h2>
      <p className="text-gray-400 mb-4">
        Select exactly {requiredPlayers} players from your team to register for this {eventType}.
      </p>

      {loading && (
        <div className="text-center py-4">Loading players...</div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {availablePlayers.length === 0 && <p>No players found for this team.</p>}
          {availablePlayers.map((player) => {
            const isSelected = selectedPlayerIds.includes(player.user_id);
            const playerInfo = player.players; // Access nested player info

            if (!playerInfo) return null; // Skip if nested player data is missing

            return (
              <div
                key={player.user_id}
                onClick={() => handlePlayerSelect(player.user_id)}
                className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors duration-150 ease-in-out border
                            ${isSelected
                              ? 'bg-blue-900 border-blue-700 ring-2 ring-blue-500'
                              : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                            }`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={playerInfo.avatar_url || '/default-avatar.png'} // Provide a default avatar
                    alt={playerInfo.display_name || 'Player'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium">{playerInfo.display_name || 'Unnamed Player'}</p>
                    <p className="text-xs text-gray-400">{playerInfo.online_id || 'No Online ID'}</p>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Selected: {selectedPlayerIds.length} / {requiredPlayers}
        </p>
        <div className="space-x-3">
           <button
            type="button"
            onClick={onCancel} // Use the cancel callback
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={selectedPlayerIds.length !== requiredPlayers || loading}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                        ${selectedPlayerIds.length === requiredPlayers
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
          >
            Continue ({selectedPlayerIds.length}/{requiredPlayers})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerSelectionForm;