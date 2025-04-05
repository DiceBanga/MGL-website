import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronRight, Check, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { DbTeam, DbTeamMember } from '../types/database';

interface TournamentRegistrationFormProps {
  team: DbTeam;
  members: DbTeamMember[];
  onSubmit: (data: {
    tournament_id: string;
    tournamentName: string;
    playerIds: string[];
  }) => void;
  onCancel: () => void;
}

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  prize_pool: number;
  payment_amount: number;
  registration_start_date: string | null;
  registration_end_date: string | null;
}

const TournamentRegistrationForm: React.FC<TournamentRegistrationFormProps> = ({
  team,
  members,
  onSubmit,
  onCancel
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'registration')
        .lt('registration_start_date', today)
        .gt('registration_end_date', today)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      setTournaments(data || []);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Failed to load available tournaments.');
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setSelectedPlayers(members.map(m => m.user_id)); // Pre-select all team members
    setStep(2);
  };

  const handlePlayerToggle = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      // If already selected, remove from selection
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      // If not selected, add to selection
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const handleSubmit = () => {
    if (!selectedTournament) return;
    
    onSubmit({
      tournament_id: selectedTournament.id,
      tournamentName: selectedTournament.name,
      playerIds: selectedPlayers
    });
  };

  const canProceed = () => {
    return selectedPlayers.length >= 4; // Minimum 4 players required
  };

  const getRegistrationStatus = (tournament: Tournament) => {
    const now = new Date();
    const regStart = tournament.registration_start_date ? new Date(tournament.registration_start_date) : null;
    const regEnd = tournament.registration_end_date ? new Date(tournament.registration_end_date) : null;
    
    if (!regStart || !regEnd) return 'unknown';
    
    if (now < regStart) return 'upcoming';
    if (now > regEnd) return 'closed';
    return 'open';
  };

  // Render loading state
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Tournament Registration</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Tournament Registration</h2>
        <div className="bg-red-900/50 rounded-lg p-4 text-white">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Tournament Selection
  if (step === 1) {
    if (tournaments.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Tournament Registration</h2>
          <div className="bg-blue-900/50 rounded-lg p-4 text-white">
            <div className="flex items-start">
              <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No Tournaments Available</p>
                <p className="text-sm opacity-80">There are no tournaments currently open for registration.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Tournament Registration</h2>
        <p className="text-white/70 mb-4">Select a tournament to register your team for:</p>
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {tournaments.map(tournament => (
            <motion.div
              key={tournament.id}
              className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
              onClick={() => handleTournamentSelect(tournament)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-lg">{tournament.name}</h3>
                  <p className="text-sm text-white/70">
                    {tournament.start_date && new Date(tournament.start_date).toLocaleDateString()} - 
                    {tournament.end_date && new Date(tournament.end_date).toLocaleDateString()}
                  </p>
                  <div className="mt-1">
                    <span className="text-sm bg-purple-600 text-white px-2 py-0.5 rounded">
                      ${tournament.payment_amount.toFixed(2)}
                    </span>
                    {tournament.prize_pool > 0 && (
                      <span className="text-sm bg-green-600 text-white px-2 py-0.5 rounded ml-2">
                        Prize: ${tournament.prize_pool.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/50" />
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Player Selection
  if (step === 2) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-2">Tournament Registration</h2>
        <h3 className="text-lg text-white/90 mb-4">{selectedTournament?.name}</h3>
        
        <button
          onClick={() => setShowRules(!showRules)}
          className="mb-4 text-blue-400 text-sm flex items-center hover:underline"
        >
          {showRules ? 'Hide' : 'Show'} tournament rules
          <ChevronRight className={`ml-1 w-4 h-4 transition-transform ${showRules ? 'rotate-90' : ''}`} />
        </button>
        
        {showRules && (
          <div className="mb-4 bg-gray-700/50 p-4 rounded-lg text-white/80 text-sm">
            <h4 className="font-medium mb-2 text-white">Tournament Rules</h4>
            <p className="mb-2">
              {selectedTournament?.description || 'No specific rules provided for this tournament.'}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Registration fee: ${selectedTournament?.payment_amount.toFixed(2)}</li>
              <li>Prize pool: ${selectedTournament?.prize_pool.toFixed(2)}</li>
              <li>You must select at least 4 players from your roster</li>
              <li>All players must be valid members of your team</li>
              <li>Players can be changed up to 24 hours before the tournament begins</li>
            </ul>
          </div>
        )}
        
        <div className="mb-4">
          <h4 className="text-white font-medium mb-2">Select Players for Tournament Roster:</h4>
          <p className="text-white/70 text-sm mb-3">Select at least 4 players to register for the tournament.</p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {members.map(member => (
              <div 
                key={member.user_id}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedPlayers.includes(member.user_id) 
                    ? 'bg-purple-900/30 border border-purple-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
                }`}
                onClick={() => handlePlayerToggle(member.user_id)}
              >
                <div className="flex-1">
                  <p className="font-medium text-white">{member.players?.display_name || 'Player'}</p>
                  <p className="text-sm text-white/60">{member.role}</p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  selectedPlayers.includes(member.user_id) 
                    ? 'bg-purple-600' 
                    : 'bg-gray-600'
                }`}>
                  {selectedPlayers.includes(member.user_id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {selectedPlayers.length < 4 && (
            <div className="mt-3 text-orange-400 text-sm flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              You need to select at least 4 players
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => setStep(1)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Back
          </button>
          <button
            onClick={() => setStep(3)}
            className={`px-4 py-2 bg-purple-600 text-white rounded-lg ${
              canProceed() ? 'hover:bg-purple-500' : 'opacity-50 cursor-not-allowed'
            }`}
            disabled={!canProceed()}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Review and Confirm
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-2">Tournament Registration</h2>
      <h3 className="text-lg text-white/90 mb-4">Review and Confirm</h3>
      
      <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
        <div className="mb-3">
          <p className="text-sm text-white/70">Tournament</p>
          <p className="text-white font-medium">{selectedTournament?.name}</p>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-white/70">Team</p>
          <p className="text-white font-medium">{team.name}</p>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-white/70">Registration Fee</p>
          <p className="text-white font-medium">${selectedTournament?.payment_amount.toFixed(2)}</p>
        </div>
        
        <div>
          <p className="text-sm text-white/70 mb-1">Selected Players ({selectedPlayers.length})</p>
          <div className="grid grid-cols-2 gap-2">
            {selectedPlayers.map(playerId => {
              const player = members.find(m => m.user_id === playerId);
              return (
                <p key={playerId} className="text-white text-sm">
                  {player?.players?.display_name || 'Player'}
                </p>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setStep(2)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
        >
          Complete Registration
        </button>
      </div>
    </div>
  );
};

export default TournamentRegistrationForm; 