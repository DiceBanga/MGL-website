import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trophy, Calendar, Settings, Plus, Trash2, User2, Globe, Mail, AlertTriangle, Check, X, DollarSign } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface TeamMember {
  id: string;
  display_name: string;
  role: string;
  jersey_number: number | null;
  can_be_deleted: boolean;
  avatar_url?: string | null;
}

interface JoinRequest {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  email: string | null;
  captain_id: string;
}

interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  prize_pool: string;
}

interface League {
  id: string;
  name: string;
  current_season: number;
  status: string;
}

interface Registration {
  id: string;
  name: string;
  type: 'tournament' | 'league';
  status: string;
  date: string;
  roster: TeamMember[];
}

interface DeleteConfirmation {
  type: 'disband' | 'transfer';
  show: boolean;
  targetId?: string;
  step: 1 | 2;
}

interface RegistrationModal {
  show: boolean;
  type: 'tournament' | 'league';
  id: string;
  name: string;
}

const TeamDashboard = () => {
  const { teamId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Team>>({});
  const [isCaptain, setIsCaptain] = useState(false);
  const [showSignPlayers, setShowSignPlayers] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    type: 'disband',
    show: false,
    step: 1
  });
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationType, setRegistrationType] = useState<'tournament' | 'league'>('tournament');
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [availableLeagues, setAvailableLeagues] = useState<League[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedEventName, setSelectedEventName] = useState<string>('');
  const [selectedPlayers, setSelectedPlayers] = useState<TeamMember[]>([]);
  const [availableRosterPlayers, setAvailableRosterPlayers] = useState<TeamMember[]>([]);
  const [captain, setCaptain] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchTeamData();
  }, [user, teamId, navigate]);

  useEffect(() => {
    if (isCaptain) {
      fetchAvailableEvents();
      fetchTeamRegistrations();
    }
  }, [isCaptain, teamId]);

  useEffect(() => {
    if (members.length > 0) {
      const captainMember = members.find(member => member.role === 'captain');
      if (captainMember) {
        setCaptain(captainMember);
      }
    }
  }, [members]);

  const fetchTeamData = async () => {
    if (!teamId) return;

    // Fetch team data
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      return;
    }

    setTeam(teamData);
    setFormData(teamData);
    setIsCaptain(teamData.captain_id === user?.id);

    // Fetch team members
    const { data: membersData, error: membersError } = await supabase
      .from('team_players')
      .select(`
        user_id,
        role,
        jersey_number,
        can_be_deleted,
        players!inner (
          display_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return;
    }

    setMembers(membersData.map(member => ({
      id: member.user_id,
      display_name: member.players.display_name,
      role: member.role,
      jersey_number: member.jersey_number,
      can_be_deleted: member.can_be_deleted,
      avatar_url: member.players.avatar_url
    })));

    // Fetch join requests if captain
    if (teamData.captain_id === user?.id) {
      const { data: requestsData, error: requestsError } = await supabase
        .from('team_join_requests')
        .select(`
          id,
          user_id,
          created_at,
          players!inner (
            display_name,
            avatar_url
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending');

      if (!requestsError && requestsData) {
        setJoinRequests(requestsData.map(request => ({
          id: request.id,
          user_id: request.user_id,
          display_name: request.players.display_name,
          avatar_url: request.players.avatar_url,
          created_at: request.created_at
        })));
      }
    }
  };

  const fetchAvailableEvents = async () => {
    // Fetch available tournaments
    const { data: tournamentsData, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id, name, status')
      .eq('status', 'registration')
      .order('name');

    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError);
    } else {
      setAvailableTournaments(tournamentsData || []);
    }

    // Fetch available leagues
    const { data: leaguesData, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name');

    if (leaguesError) {
      console.error('Error fetching leagues:', leaguesError);
    } else {
      setAvailableLeagues(leaguesData || []);
    }
  };

  const fetchTeamRegistrations = async () => {
    if (!teamId) return;

    // Fetch tournament registrations
    const { data: tournamentRegs, error: tournamentError } = await supabase
      .from('tournament_registrations')
      .select(`
        id,
        status,
        registration_date,
        tournaments:tournament_id(name),
        tournament_rosters(
          player_id,
          players:player_id(display_name, avatar_url)
        )
      `)
      .eq('team_id', teamId);

    if (tournamentError) {
      console.error('Error fetching tournament registrations:', tournamentError);
    }

    // Fetch league registrations
    const { data: leagueRegs, error: leagueError } = await supabase
      .from('league_registrations')
      .select(`
        id,
        status,
        registration_date,
        leagues:league_id(name),
        league_rosters(
          player_id,
          players:player_id(display_name, avatar_url)
        )
      `)
      .eq('team_id', teamId);

    if (leagueError) {
      console.error('Error fetching league registrations:', leagueError);
    }

    // Combine and format registrations
    const formattedRegistrations: Registration[] = [
      ...(tournamentRegs || []).map(reg => ({
        id: reg.id,
        name: reg.tournaments.name,
        type: 'tournament' as const,
        status: reg.status,
        date: new Date(reg.registration_date).toLocaleDateString(),
        roster: reg.tournament_rosters.map(roster => ({
          id: roster.player_id,
          display_name: roster.players.display_name,
          role: 'player',
          jersey_number: null,
          can_be_deleted: false,
          avatar_url: roster.players.avatar_url
        }))
      })),
      ...(leagueRegs || []).map(reg => ({
        id: reg.id,
        name: reg.leagues.name,
        type: 'league' as const,
        status: reg.status,
        date: new Date(reg.registration_date).toLocaleDateString(),
        roster: reg.league_rosters.map(roster => ({
          id: roster.player_id,
          display_name: roster.players.display_name,
          role: 'player',
          jersey_number: null,
          can_be_deleted: false,
          avatar_url: roster.players.avatar_url
        }))
      }))
    ];

    setRegistrations(formattedRegistrations);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId) return;

    const { error } = await supabase
      .from('teams')
      .update(formData)
      .eq('id', teamId);

    if (error) {
      console.error('Error updating team:', error);
      return;
    }

    setTeam(formData as Team);
    setIsEditing(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!teamId) return;

    const { error } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return;
    }

    setMembers(members.filter(member => member.id !== memberId));
  };

  const handleApproveJoinRequest = async (requestId: string, userId: string) => {
    const { error: approvalError } = await supabase
      .from('team_join_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (approvalError) {
      console.error('Error approving request:', approvalError);
      return;
    }

    const { error: addPlayerError } = await supabase
      .from('team_players')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: 'player',
        can_be_deleted: true
      });

    if (addPlayerError) {
      console.error('Error adding player:', addPlayerError);
      return;
    }

    // Refresh data
    fetchTeamData();
  };

  const handleRejectJoinRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('team_join_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      return;
    }

    setJoinRequests(joinRequests.filter(request => request.id !== requestId));
  };

  const handleTransferOwnership = async (newCaptainId: string) => {
    try {
      const { error } = await supabase.rpc('transfer_team_ownership', {
        p_team_id: teamId,
        p_new_captain_id: newCaptainId
      });

      if (error) {
        console.error('Error transferring ownership:', error);
        return;
      }

      // Refresh data
      fetchTeamData();
      setDeleteConfirmation({ type: 'transfer', show: false, step: 1 });
    } catch (err) {
      console.error('Error transferring ownership:', err);
    }
  };

  const handleDisbandTeam = async () => {
    if (!teamId) return;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      console.error('Error disbanding team:', error);
      return;
    }

    navigate('/dashboard');
  };

  const handleRegistrationClick = (type: 'tournament' | 'league') => {
    setRegistrationType(type);
    setSelectedEvent('');
    setSelectedEventName('');
    setSelectedPlayers([]);
    setAvailableRosterPlayers([...members]);
    
    // Pre-select captain
    if (captain) {
      setSelectedPlayers([captain]);
      setAvailableRosterPlayers(members.filter(m => m.id !== captain.id));
    }
    
    setShowRegistrationForm(true);
  };

  const handleEventSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    setSelectedEvent(eventId);
    
    if (eventId) {
      // Find event name
      if (registrationType === 'tournament') {
        const tournament = availableTournaments.find(t => t.id === eventId);
        if (tournament) setSelectedEventName(tournament.name);
      } else {
        const league = availableLeagues.find(l => l.id === eventId);
        if (league) setSelectedEventName(league.name);
      }
    } else {
      setSelectedEventName('');
    }
  };

  const handlePlayerSelection = (player: TeamMember) => {
    // Maximum 5 players
    if (selectedPlayers.length >= 5 && !selectedPlayers.some(p => p.id === player.id)) {
      return;
    }

    // If player is already selected, remove them
    if (selectedPlayers.some(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
      setAvailableRosterPlayers([...availableRosterPlayers, player]);
    } else {
      // Add player to selected list
      setSelectedPlayers([...selectedPlayers, player]);
      setAvailableRosterPlayers(availableRosterPlayers.filter(p => p.id !== player.id));
    }
  };

  const handleRemoveSelectedPlayer = (playerId: string) => {
    // Don't allow removing captain
    if (captain && captain.id === playerId) {
      return;
    }

    const playerToRemove = selectedPlayers.find(p => p.id === playerId);
    if (playerToRemove) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
      setAvailableRosterPlayers([...availableRosterPlayers, playerToRemove]);
    }
  };

  const handleRegister = async () => {
    if (!teamId || !selectedEvent || selectedPlayers.length !== 5) return;

    setIsRegistering(true);
    
    try {
      // Create payment details
      const paymentDetails = {
        id: `reg-${Date.now()}`,
        type: registrationType,
        name: selectedEventName,
        amount: registrationType === 'tournament' ? 50 : 100,
        description: `Registration fee for ${selectedEventName}`,
        teamId: teamId,
        eventId: selectedEvent,
        playersIds: selectedPlayers.map(p => p.id)
      };
      
      // Navigate to payment page
      navigate('/payments', { state: { paymentDetails } });
    } catch (error) {
      console.error('Error during registration:', error);
      setIsRegistering(false);
    }
  };

  if (!isCaptain) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="mt-2 text-gray-300">
              Only team captains can access the team dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Info Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Team Information</h2>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-green-500 hover:text-green-400"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation({ type: 'disband', show: true, step: 1 })}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Team Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-500/10 p-3 rounded-lg">
                      <Users className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Team Name</p>
                      <p className="text-white">{team?.name}</p>
                    </div>
                  </div>

                  {team?.website && (
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-500/10 p-3 rounded-lg">
                        <Globe className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Website</p>
                        <a
                          href={team.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500 hover:text-green-400"
                        >
                          {team.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {team?.email && (
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-500/10 p-3 rounded-lg">
                        <Mail className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Email</p>
                        <p className="text-white">{team.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team Roster Section */}
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Team Roster</h2>
                <button
                  onClick={() => setShowSignPlayers(!showSignPlayers)}
                  className="text-green-500 hover:text-green-400 flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Sign Players</span>
                </button>
              </div>

              {showSignPlayers && (
                <div className="mb-6 bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Pending Join Requests</h3>
                  {joinRequests.length > 0 ? (
                    <div className="space-y-4">
                      {joinRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between bg-gray-600/50 p-4 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                              {request.avatar_url ? (
                                <img
                                  src={request.avatar_url}
                                  alt={request.display_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User2 className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-white">{request.display_name}</p>
                              <p className="text-sm text-gray-400">
                                Requested {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveJoinRequest(request.id, request.user_id)}
                              className="px-3 py-1 bg-green-700 text-white rounded-md hover:bg-green-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectJoinRequest(request.id)}
                              className="px-3 py-1 bg-red-700 text-white rounded-md hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No pending join requests</p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-gray-700/50 p-4 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User2 className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white">{member.display_name}</p>
                        <p className="text-sm text-gray-400">
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          {member.jersey_number && ` • #${member.jersey_number}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {member.role !== 'captain' && (
                        <button
                          onClick={() => setDeleteConfirmation({
                            type: 'transfer',
                            show: true,
                            step: 1,
                            targetId: member.id
                          })}
                          className="text-green-500 hover:text-green-400"
                        >
                          Make Captain
                        </button>
                      )}
                      {member.can_be_deleted && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Registrations Section */}
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Registrations</h2>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleRegistrationClick('tournament')}
                    className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Join Tournament
                  </button>
                  <button
                    onClick={() => handleRegistrationClick('league')}
                    className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Join League
                  </button>
                </div>
              </div>

              {showRegistrationForm ? (
                <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Register for {registrationType === 'tournament' ? 'Tournament' : 'League'}
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select {registrationType === 'tournament' ? 'Tournament' : 'League'}
                      </label>
                      <select
                        value={selectedEvent}
                        onChange={handleEventSelection}
                        className="w-full bg-gray-600 border-gray-700 rounded-md text-white p-2"
                      >
                        <option value="">Select...</option>
                        {registrationType === 'tournament'
                          ? availableTournaments.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))
                          : availableLeagues.map((l) => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))
                        }
                      </select>
                    </div>
                    
                    {selectedEvent && (
                      <>
                        <div>
                          <h4 className="text-lg font-medium text-white mb-3">Team Members (5)</h4>
                          <div className="space-y-2">
                            {selectedPlayers.map((player, index) => (
                              <div key={player.id} className="flex items-center justify-between bg-gray-600/70 p-3 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                                    {player.avatar_url ? (
                                      <img
                                        src={player.avatar_url}
                                        alt={player.display_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User2 className="w-5 h-5 text-green-500" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-white">{player.display_name}</p>
                                    <p className="text-xs text-gray-400">
                                      {index === 0 ? 'Captain' : `Player ${index}`}
                                    </p>
                                  </div>
                                </div>
                                {index !== 0 && (
                                  <button
                                    onClick={() => handleRemoveSelectedPlayer(player.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            
                            {/* Empty slots */}
                            {Array.from({ length: Math.max(0, 5 - selectedPlayers.length) }).map((_, index) => (
                              <div key={`empty-${index}`} className="flex items-center justify-between bg-gray-600/30 p-3 rounded-lg border border-dashed border-gray-500">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                                    <User2 className="w-5 h-5 text-gray-500" />
                                  </div>
                                  <p className="text-gray-400">Select a player</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-medium text-white mb-3">Available Players</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                            {availableRosterPlayers.map((player) => (
                              <div
                                key={player.id}
                                onClick={() => handlePlayerSelection(player)}
                                className="flex items-center space-x-3 bg-gray-600/50 p-3 rounded-lg cursor-pointer hover:bg-gray-500/50"
                              >
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                                  {player.avatar_url ? (
                                    <img
                                      src={player.avatar_url}
                                      alt={player.display_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User2 className="w-5 h-5 text-green-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white">{player.display_name}</p>
                                  <p className="text-xs text-gray-400">{player.role}</p>
                                </div>
                              </div>
                            ))}
                            
                            {availableRosterPlayers.length === 0 && (
                              <p className="text-gray-400 col-span-2 text-center py-4">No more players available</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-4">
                          <button
                            onClick={() => setShowRegistrationForm(false)}
                            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleRegister}
                            disabled={selectedPlayers.length !== 5 || isRegistering}
                            className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {isRegistering ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Registering...
                              </>
                            ) : (
                              'Register'
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.length > 0 ? (
                    registrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="bg-gray-700/50 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-white font-medium">{reg.name}</h3>
                            <p className="text-sm text-gray-400">
                              {reg.type === 'tournament' ? 'Tournament' : 'League'} • {reg.status}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <button className="text-green-500 hover:text-green-400">
                              View Details
                            </button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-2">Roster:</p>
                          <div className="flex flex-wrap gap-2">
                            {reg.roster.map((player) => (
                              <div
                                key={player.id}
                                className="flex items-center space-x-2 bg-gray-600/50 px-3 py-1 rounded-full"
                              >
                                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                                  {player.avatar_url ? (
                                    <img
                                      src={player.avatar_url}
                                      alt={player.display_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User2 className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                                <span className="text-sm text-white">{player.display_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">No registrations yet. Register for tournaments or leagues to compete!</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Team Stats Section */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Team Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500/10 p-2 rounded-lg">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-gray-300">Win Rate</span>
                  </div>
                  <span className="text-white font-semibold">75%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500/10 p-2 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-gray-300">Games Played</span>
                  </div>
                  <span className="text-white font-semibold">32</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500/10 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-gray-300">Active Members</span>
                  </div>
                  <span className="text-white font-semibold">{members.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete/Transfer Confirmation Modal */}
        {deleteConfirmation.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              {deleteConfirmation.type === 'disband' ? (
                <>
                  {deleteConfirmation.step === 1 ? (
                    <div className="text-center">
                      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Disband Team?</h3>
                      <p className="text-gray-300 mb-6">
                        Are you sure you want to disband this team? This action cannot be undone.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => setDeleteConfirmation({ ...deleteConfirmation, step: 2 })}
                          className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600"
                        >
                          Yes, Disband Team
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation({ type: 'disband', show: false, step: 1 })}
                          className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Final Confirmation</h3>
                      <p className="text-gray-300 mb-6">
                        Type "DISBAND" to confirm you want to permanently delete this team.
                      </p>
                      <input
                        type="text"
                        className="w-full bg-gray-700 border-gray-600 rounded-md mb-4 px-4 py-2 text-white"
                        placeholder="Type DISBAND"
                        onChange={(e) => {
                          if (e.target.value === 'DISBAND') {
                            handleDisbandTeam();
                          }
                        }}
                      />
                      <button
                        onClick={() => setDeleteConfirmation({ type: 'disband', show: false, step: 1 })}
                        className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {deleteConfirmation.step === 1 ? (
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-2">Transfer Team Ownership</h3>
                      <p className="text-gray-300 mb-6">
                        Are you sure you want to transfer team ownership? You will become a regular team member.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => setDeleteConfirmation({ ...deleteConfirmation, step: 2 })}
                          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
                        >
                          Continue
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation({ type: 'transfer', show: false, step: 1 })}
                          className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-2">Final Confirmation</h3>
                      <p className="text-gray-300 mb-6">
                        Type "TRANSFER" to confirm the ownership transfer.
                      </p>
                      <input
                        type="text"
                        className="w-full bg-gray-700 border-gray-600 rounded-md mb-4 px-4 py-2 text-white"
                        placeholder="Type TRANSFER"
                        onChange={(e) => {
                          if (e.target.value === 'TRANSFER' && deleteConfirmation.targetId) {
                            handleTransferOwnership(deleteConfirmation.targetId);
                          }
                        }}
                      />
                      <button
                        onClick={() => setDeleteConfirmation({ type: 'transfer', show: false, step: 1 })}
                        className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboard;