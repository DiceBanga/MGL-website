import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronRight, Check, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { DbTeam, DbTeamMember } from '../types/database';

interface LeagueRegistrationFormProps {
  team: DbTeam;
  members: DbTeamMember[];
  onSubmit: (data: {
    league_id: string;
    leagueName: string;
    season: number;
    playerIds: string[];
  }) => void;
  onCancel: () => void;
}

interface League {
  id: string;
  name: string;
  description: string | null;
  status: string;
  current_season: number;
  prize_pool: number;
  payment_amount: number;
  registration_start_date: string | null;
  registration_end_date: string | null;
}

const LeagueRegistrationForm: React.FC<LeagueRegistrationFormProps> = ({
  team,
  members,
  onSubmit,
  onCancel
}) => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('status', 'registration')
        .lt('registration_start_date', today)
        .gt('registration_end_date', today)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setLeagues(data || []);
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError('Failed to load available leagues.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueSelect = (league: League) => {
    setSelectedLeague(league);
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
    if (!selectedLeague) return;
    
    onSubmit({
      league_id: selectedLeague.id,
      leagueName: selectedLeague.name,
      season: selectedLeague.current_season,
      playerIds: selectedPlayers
    });
  };

  const canProceed = () => {
    return selectedPlayers.length >= 5; // Minimum 5 players required for league
  };

  const getRegistrationStatus = (league: League) => {
    const now = new Date();
    const regStart = league.registration_start_date ? new Date(league.registration_start_date) : null;
    const regEnd = league.registration_end_date ? new Date(league.registration_end_date) : null;
    
    if (!regStart || !regEnd) return 'unknown';
    
    if (now < regStart) return 'upcoming';
    if (now > regEnd) return 'closed';
    return 'open';
  };

  // Render loading state
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">League Registration</h2>
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
        <h2 className="text-xl font-bold text-white mb-4">League Registration</h2>
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

  // Step 1: League Selection
  if (step === 1) {
    if (leagues.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">League Registration</h2>
          <div className="bg-blue-900/50 rounded-lg p-4 text-white">
            <div className="flex items-start">
              <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No Leagues Available</p>
                <p className="text-sm opacity-80">There are no leagues currently open for registration.</p>
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
        <h2 className="text-xl font-bold text-white mb-4">League Registration</h2>
        <p className="text-white/70 mb-4">Select a league to register your team for:</p>
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {leagues.map(league => (
            <motion.div
              key={league.id}
              className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
              onClick={() => handleLeagueSelect(league)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-lg">{league.name}</h3>
                  <p className="text-sm text-white/70">
                    Season {league.current_season}
                  </p>
                  <div className="mt-1">
                    <span className="text-sm bg-green-600 text-white px-2 py-0.5 rounded">
                      ${league.payment_amount.toFixed(2)}
                    </span>
                    {league.prize_pool > 0 && (
                      <span className="text-sm bg-green-600 text-white px-2 py-0.5 rounded ml-2">
                        Prize: ${league.prize_pool.toFixed(2)}
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
        <h2 className="text-xl font-bold text-white mb-2">League Registration</h2>
        <h3 className="text-lg text-white/90 mb-4">{selectedLeague?.name} - Season {selectedLeague?.current_season}</h3>
        
        <button
          onClick={() => setShowRules(!showRules)}
          className="mb-4 text-blue-400 text-sm flex items-center hover:underline"
        >
          {showRules ? 'Hide' : 'Show'} league rules
          <ChevronRight className={`ml-1 w-4 h-4 transition-transform ${showRules ? 'rotate-90' : ''}`} />
        </button>
        
        {showRules && (
          <div className="mb-4 bg-gray-700/50 p-4 rounded-lg text-white/80 text-sm">
            <h4 className="font-medium mb-2 text-white">League Rules</h4>
            <p className="mb-2">
              {selectedLeague?.description || 'No specific rules provided for this league.'}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Registration fee: ${selectedLeague?.payment_amount.toFixed(2)}</li>
              <li>Prize pool: ${selectedLeague?.prize_pool.toFixed(2)}</li>
              <li>You must select at least 5 players from your roster</li>
              <li>All players must be valid members of your team</li>
              <li>Players can be changed between seasons</li>
              <li>Once registered, your team will be in the league for the entire season</li>
            </ul>
          </div>
        )}
        
        <div className="mb-4">
          <h4 className="text-white font-medium mb-2">Select Players for League Roster:</h4>
          <p className="text-white/70 text-sm mb-3">Select at least 5 players to register for the league.</p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {members.map(member => (
              <div 
                key={member.user_id}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedPlayers.includes(member.user_id) 
                    ? 'bg-green-900/30 border border-green-500/50' 
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
                    ? 'bg-green-600' 
                    : 'bg-gray-600'
                }`}>
                  {selectedPlayers.includes(member.user_id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {selectedPlayers.length < 5 && (
            <div className="mt-3 text-orange-400 text-sm flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              You need to select at least 5 players for league play
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
            className={`px-4 py-2 bg-green-600 text-white rounded-lg ${
              canProceed() ? 'hover:bg-green-500' : 'opacity-50 cursor-not-allowed'
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
      <h2 className="text-xl font-bold text-white mb-2">League Registration</h2>
      <h3 className="text-lg text-white/90 mb-4">Review and Confirm</h3>
      
      <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
        <div className="mb-3">
          <p className="text-sm text-white/70">League</p>
          <p className="text-white font-medium">{selectedLeague?.name} - Season {selectedLeague?.current_season}</p>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-white/70">Team</p>
          <p className="text-white font-medium">{team.name}</p>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-white/70">Registration Fee</p>
          <p className="text-white font-medium">${selectedLeague?.payment_amount.toFixed(2)}</p>
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
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
        >
          Complete Registration
        </button>
      </div>
    </div>
  );
};

export default LeagueRegistrationForm; 