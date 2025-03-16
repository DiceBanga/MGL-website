import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trophy, Calendar, Settings, Plus, Trash2, User2, Globe, Mail, AlertTriangle, Check, X, DollarSign, ChevronRight, UserCog, Paintbrush, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface TeamMember {
  id: string;
  display_name: string;
  role: string;
  jersey_number: number | null;
  can_be_deleted: boolean;
  avatar_url?: string | null;
  online_id?: string | null;
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
  team_tag?: string | null;
  description?: string | null;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  prize_pool: number;
}

interface League {
  id: string;
  name: string;
  status: string;
  current_season: number;
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

interface RosterPlayer {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'player' | 'captain';
}

interface TournamentRoster {
  player_id: string;
  players: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface LeagueRoster {
  player_id: string;
  players: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface TournamentRegistration {
  id: string;
  status: string;
  registration_date: string;
  tournaments: {
    name: string;
  };
  tournament_rosters: TournamentRoster[];
}

interface LeagueRegistration {
  id: string;
  status: string;
  registration_date: string;
  leagues: {
    name: string;
  };
  league_rosters: LeagueRoster[];
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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRosterChangeModal, setShowRosterChangeModal] = useState(false);
  const [showOnlineIdChangeModal, setShowOnlineIdChangeModal] = useState(false);
  const [showTeamRebrandModal, setShowTeamRebrandModal] = useState(false);
  
  // Front Office state variables
  const [availableEvents, setAvailableEvents] = useState<{id: string, name: string, type: 'tournament' | 'league'}[]>([]);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState<string>('');
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('');
  const [availablePlayers, setAvailablePlayers] = useState<TeamMember[]>([]);
  const [selectedRosterPlayers, setSelectedRosterPlayers] = useState<TeamMember[]>([]);
  const [rosterChangePrice, setRosterChangePrice] = useState<number>(0);
  
  const [selectedOnlineIdEvent, setSelectedOnlineIdEvent] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [newOnlineId, setNewOnlineId] = useState<string>('');
  const [onlineIdChangePrice, setOnlineIdChangePrice] = useState<number>(0);
  
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamTag, setNewTeamTag] = useState<string>('');
  const [newTeamDescription, setNewTeamDescription] = useState<string>('');
  const [newTeamLogo, setNewTeamLogo] = useState<File | null>(null);
  const [newTeamLogoPreview, setNewTeamLogoPreview] = useState<string | null>(null);
  const [teamRebrandPrice, setTeamRebrandPrice] = useState<number>(0);
  const [teamTransferPrice, setTeamTransferPrice] = useState<number>(0);
  
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // State for confirmation modals
  const [rosterChangeConfirmation, setRosterChangeConfirmation] = useState<{show: boolean, step: 1 | 2}>({
    show: false,
    step: 1
  });
  
  const [onlineIdChangeConfirmation, setOnlineIdChangeConfirmation] = useState<{show: boolean, step: 1 | 2}>({
    show: false,
    step: 1
  });
  
  const [teamRebrandConfirmation, setTeamRebrandConfirmation] = useState<{show: boolean, step: 1 | 2}>({
    show: false,
    step: 1
  });

  useEffect(() => {
    if (user) {
      fetchTeamData();
    } else {
      navigate('/login');
    }
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
      .select('id, name, status, start_date, end_date, prize_pool')
      .eq('status', 'registration')
      .order('name');

    if (tournamentsError) {
      setError('Error fetching tournaments: ' + tournamentsError.message);
    } else {
      setAvailableTournaments(tournamentsData as Tournament[] || []);
    }

    // Fetch available leagues
    const { data: leaguesData, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, status, current_season')
      .eq('status', 'active')
      .order('name');

    if (leaguesError) {
      setError('Error fetching leagues: ' + leaguesError.message);
    } else {
      setAvailableLeagues(leaguesData as League[] || []);
    }
  };

  const fetchTeamRegistrations = async () => {
    if (!teamId) return;

    try {
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
        throw new Error('Error fetching tournament registrations: ' + tournamentError.message);
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
        throw new Error('Error fetching league registrations: ' + leagueError.message);
      }

      // Combine and format registrations
      const formattedRegistrations: Registration[] = [
        ...((tournamentRegs || []) as unknown as TournamentRegistration[]).map(reg => ({
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
        ...((leagueRegs || []) as unknown as LeagueRegistration[]).map(reg => ({
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching registrations');
      setRegistrations([]);
    }
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

    try {
      const { error: updateError } = await supabase
        .from('teams')
        .update(formData)
        .eq('id', teamId);

      if (updateError) {
        throw new Error('Error updating team: ' + updateError.message);
      }

      setTeam(formData as Team);
      setIsEditing(false);
      setSuccessMessage('Team updated successfully');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the team');
    }
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
      // Get item price
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('current_price')
        .eq('item_id', '1002')
        .single();

      if (itemError) throw new Error('Error fetching item price: ' + itemError.message);
      
      // Create reference ID with the proper format
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${month}${day}${year}`;
      
      // Get first 8 chars of IDs and remove hyphens
      const teamIdPart = teamId?.replace(/-/g, '').slice(0, 8) || '';
      const captainIdPart = user?.id?.replace(/-/g, '').slice(0, 8) || '';
      const playerIdPart = newCaptainId.replace(/-/g, '').slice(0, 8) || '';
      
      // Construct reference ID according to the format: date-itemId-teamId-captainId-playerId
      const referenceId = `${dateStr}-1002-${teamIdPart}-${captainIdPart}-${playerIdPart}`;
      
      console.log('Created payment details with formatted reference ID:', referenceId);
      
      // Create change request
      const { data: requestData, error: requestError } = await supabase
        .from('team_change_requests')
        .insert({
          team_id: teamId,
          request_type: 'team_transfer',
          requested_by: user?.id,
          player_id: newCaptainId,
          old_value: user?.id,
          new_value: newCaptainId,
          item_id: '1002',
          status: 'pending',
          metadata: {
            referenceId: referenceId
          }
        })
        .select()
        .single();

      if (requestError) throw new Error('Error creating request: ' + requestError.message);

      // Redirect to payment page with payment details
      navigate('/payments', { 
        state: { 
          paymentDetails: {
            id: requestData.id,
            name: 'Team Transfer',
            description: `Transfer ownership of ${team?.name} to ${members.find(m => m.id === newCaptainId)?.display_name}`,
            amount: itemData.current_price,
            item_id: '1002',
            request_id: requestData.id,
            teamId: teamId,
            captainId: user?.id,
            playerId: newCaptainId,
            referenceId: referenceId,
            type: 'team_transfer'
          }
        }
      });
      
      // Close the modal
      setDeleteConfirmation({ type: 'transfer', show: false, step: 1 });
    } catch (err) {
      console.error('Error creating transfer request:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDisbandTeam = async () => {
    if (!teamId) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) {
        console.error('Error disbanding team:', error);
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Error:', err);
    }
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
    // If this is the captain, they must be included
    if (captain && captain.id === player.id) {
      return;
    }

    // Maximum 5 players (including captain)
    if (selectedPlayers.length >= 5 && !selectedPlayers.some(p => p.id === player.id)) {
      setError('Maximum 5 players allowed in the roster');
      return;
    }

    // If player is already selected, remove them (unless they're the captain)
    if (selectedPlayers.some(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
      setAvailableRosterPlayers([...availableRosterPlayers, player]);
    } else {
      // Add player to selected list
      setSelectedPlayers([...selectedPlayers, player]);
      setAvailableRosterPlayers(availableRosterPlayers.filter(p => p.id !== player.id));
    }

    // Clear any existing error messages
    setError(null);
  };

  const handleRemoveSelectedPlayer = (playerId: string) => {
    // Don't allow removing captain
    if (captain && captain.id === playerId) {
      setError('Team captain cannot be removed from the roster');
      return;
    }

    const playerToRemove = selectedPlayers.find(p => p.id === playerId);
    if (playerToRemove) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
      setAvailableRosterPlayers([...availableRosterPlayers, playerToRemove]);
      setError(null);
    }
  };

  const handleRegister = async () => {
    if (!teamId || !selectedEvent || selectedPlayers.length !== 5) {
      setError('Please select an event and exactly 5 players');
      return;
    }

    setIsRegistering(true);
    setError(null);
    
    try {
      // Check for existing registration
      const { data: existingReg, error: checkError } = await supabase
        .from(registrationType === 'tournament' ? 'tournament_registrations' : 'league_registrations')
        .select('id')
        .eq(registrationType === 'tournament' ? 'tournament_id' : 'league_id', selectedEvent)
        .eq('team_id', teamId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw new Error('Error checking existing registration');
      }

      if (existingReg) {
        throw new Error(`Team is already registered for this ${registrationType}`);
      }

      // Create reference ID with the new format
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${month}${day}${year}`;
      
      // Get item ID based on registration type
      const itemId = registrationType === 'tournament' ? '1003' : '1004';
      
      // Get first 8 chars of IDs and add hyphens
      const teamIdPart = teamId.replace(/-/g, '').slice(0, 8);
      const captainIdPart = captain?.id.replace(/-/g, '').slice(0, 8);
      const eventIdPart = selectedEvent.replace(/-/g, '').slice(0, 8);
      
      // Construct reference ID according to the new format
      const referenceId = `${dateStr}-${itemId}-${teamIdPart}-${captainIdPart}-${eventIdPart}`;

      // Create payment details
      const paymentDetails = {
        id: `reg-${Date.now()}`,
        type: registrationType,
        name: selectedEventName,
        amount: registrationType === 'tournament' ? 50 : 100,
        description: `Registration fee for ${selectedEventName}`,
        teamId: teamId,
        eventId: selectedEvent,
        captainId: captain?.id,
        playersIds: selectedPlayers.map(p => p.id),
        referenceId
      };
      
      console.log('Created payment details with formatted reference ID:', paymentDetails);
      
      // Navigate to payment page
      navigate('/payments', { state: { paymentDetails } });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during registration');
      setIsRegistering(false);
    }
  };

  // Front Office handler functions
  const handleRosterPlayerSelect = (player: TeamMember) => {
    if (selectedRosterPlayers.some(p => p.id === player.id)) {
      setSelectedRosterPlayers(selectedRosterPlayers.filter(p => p.id !== player.id));
    } else {
      setSelectedRosterPlayers([...selectedRosterPlayers, player]);
    }
  };

  const handleRemoveRosterPlayer = (playerId: string) => {
    setSelectedRosterPlayers(selectedRosterPlayers.filter(p => p.id !== playerId));
  };

  const handleRosterChangeSubmit = async () => {
    if (!teamId || !selectedRosterEvent || selectedRosterPlayers.length === 0) return;
    
    // Show confirmation modal instead of proceeding directly
    setRosterChangeConfirmation({show: true, step: 1});
    setShowRosterChangeModal(false);
  };
  
  const processRosterChangePayment = async () => {
    try {
      // Get item price
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('current_price')
        .eq('item_id', '1005')
        .single();

      if (itemError) throw new Error('Error fetching item price: ' + itemError.message);
      
      // Create reference ID with the proper format
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${month}${day}${year}`;
      
      // Get first 8 chars of IDs and remove hyphens
      const teamIdPart = teamId?.replace(/-/g, '').slice(0, 8) || '';
      const captainIdPart = user?.id?.replace(/-/g, '').slice(0, 8) || '';
      const eventIdPart = selectedRosterEvent.replace(/-/g, '').slice(0, 8) || '';
      
      // Construct reference ID according to the format: date-itemId-teamId-captainId-eventId
      const referenceId = `${dateStr}-1005-${teamIdPart}-${captainIdPart}-${eventIdPart}`;
      
      // Create change request
      const { data: requestData, error: requestError } = await supabase
        .from('team_change_requests')
        .insert({
          team_id: teamId,
          request_type: 'roster_change',
          requested_by: user?.id,
          tournament_id: selectedRosterEvent.startsWith('tournament_') ? selectedRosterEvent.replace('tournament_', '') : null,
          league_id: selectedRosterEvent.startsWith('league_') ? selectedRosterEvent.replace('league_', '') : null,
          item_id: '1005',
          status: 'pending',
          metadata: {
            players: selectedRosterPlayers.map(p => ({
              id: p.id,
              display_name: p.display_name
            })),
            referenceId: referenceId
          }
        })
        .select()
        .single();

      if (requestError) throw new Error('Error creating request: ' + requestError.message);

      // Redirect to payment page with payment details
      navigate('/payments', { 
        state: { 
          paymentDetails: {
            id: requestData.id,
            name: 'Roster Change',
            description: `Roster change for ${selectedRosterEvent.includes('tournament') ? 'Tournament' : 'League'}`,
            amount: itemData.current_price,
            item_id: '1005',
            request_id: requestData.id,
            teamId: teamId,
            captainId: user?.id,
            eventId: selectedRosterEvent.replace(/^(tournament_|league_)/, ''),
            referenceId: referenceId,
            type: 'roster_change'
          }
        }
      });
      
      // Close the confirmation modal
      setRosterChangeConfirmation({show: false, step: 1});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setRosterChangeConfirmation({show: false, step: 1});
    }
  };

  const handleOnlineIdChangeSubmit = async () => {
    if (!teamId || !selectedOnlineIdEvent || !selectedPlayerId || !newOnlineId) return;
    
    // Show confirmation modal instead of proceeding directly
    setOnlineIdChangeConfirmation({show: true, step: 1});
    setShowOnlineIdChangeModal(false);
  };
  
  const processOnlineIdChangePayment = async () => {
    try {
      // Get item price
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('current_price')
        .eq('item_id', '1007')
        .single();

      if (itemError) throw new Error('Error fetching item price: ' + itemError.message);
      
      // Create reference ID with the proper format
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${month}${day}${year}`;
      
      // Get first 8 chars of IDs and remove hyphens
      const teamIdPart = teamId?.replace(/-/g, '').slice(0, 8) || '';
      const captainIdPart = user?.id?.replace(/-/g, '').slice(0, 8) || '';
      const playerIdPart = selectedPlayerId.replace(/-/g, '').slice(0, 8) || '';
      
      // Construct reference ID according to the format: date-itemId-teamId-captainId-playerId
      const referenceId = `${dateStr}-1007-${teamIdPart}-${captainIdPart}-${playerIdPart}`;
      
      // Create change request
      const { data: requestData, error: requestError } = await supabase
        .from('team_change_requests')
        .insert({
          team_id: teamId,
          request_type: 'online_id_change',
          requested_by: user?.id,
          tournament_id: selectedOnlineIdEvent.startsWith('tournament_') ? selectedOnlineIdEvent.replace('tournament_', '') : null,
          league_id: selectedOnlineIdEvent.startsWith('league_') ? selectedOnlineIdEvent.replace('league_', '') : null,
          player_id: selectedPlayerId,
          old_value: members.find(m => m.id === selectedPlayerId)?.online_id || '',
          new_value: newOnlineId,
          item_id: '1007',
          status: 'pending',
          metadata: {
            referenceId: referenceId
          }
        })
        .select()
        .single();

      if (requestError) throw new Error('Error creating request: ' + requestError.message);

      // Redirect to payment page with payment details
      navigate('/payments', { 
        state: { 
          paymentDetails: {
            id: requestData.id,
            name: 'Online ID Change',
            description: `Change online ID for ${members.find(m => m.id === selectedPlayerId)?.display_name}`,
            amount: itemData.current_price,
            item_id: '1007',
            request_id: requestData.id,
            teamId: teamId,
            captainId: user?.id,
            playerId: selectedPlayerId,
            referenceId: referenceId,
            type: 'online_id_change'
          }
        }
      });
      
      // Close the confirmation modal
      setOnlineIdChangeConfirmation({show: false, step: 1});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setOnlineIdChangeConfirmation({show: false, step: 1});
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewTeamLogo(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewTeamLogoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTeamRebrandSubmit = async () => {
    if (!teamId || !newTeamName || !newTeamTag || newTeamTag.length !== 3) return;
    
    // Show confirmation modal instead of proceeding directly
    setTeamRebrandConfirmation({show: true, step: 1});
    setShowTeamRebrandModal(false);
  };
  
  const processTeamRebrandPayment = async () => {
    try {
      // Get item price
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('current_price')
        .eq('item_id', '1006')
        .single();

      if (itemError) throw new Error('Error fetching item price: ' + itemError.message);
      
      // Create reference ID with the proper format
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${month}${day}${year}`;
      
      // Get first 8 chars of IDs and remove hyphens
      const teamIdPart = teamId?.replace(/-/g, '').slice(0, 8) || '';
      const captainIdPart = user?.id?.replace(/-/g, '').slice(0, 8) || '';
      
      // Construct reference ID according to the format: date-itemId-teamId-captainId
      const referenceId = `${dateStr}-1006-${teamIdPart}-${captainIdPart}`;
      
      // Upload logo if provided
      let logoUrl = team?.logo_url;
      if (newTeamLogo) {
        const fileName = `team-logos/${teamId}/${Date.now()}-${newTeamLogo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(fileName, newTeamLogo);
          
        if (uploadError) throw new Error('Error uploading logo: ' + uploadError.message);
        
        const { data: urlData } = supabase.storage
          .from('public')
          .getPublicUrl(fileName);
          
        logoUrl = urlData.publicUrl;
      }
      
      // Create change request
      const { data: requestData, error: requestError } = await supabase
        .from('team_change_requests')
        .insert({
          team_id: teamId,
          request_type: 'team_rebrand',
          requested_by: user?.id,
          old_value: JSON.stringify({
            name: team?.name,
            tag: team?.team_tag,
            logo_url: team?.logo_url,
            description: team?.description
          }),
          new_value: JSON.stringify({
            name: newTeamName,
            tag: newTeamTag,
            logo_url: logoUrl,
            description: newTeamDescription
          }),
          item_id: '1006',
          status: 'pending',
          metadata: {
            referenceId: referenceId
          }
        })
        .select()
        .single();

      if (requestError) throw new Error('Error creating request: ' + requestError.message);

      // Redirect to payment page with payment details
      navigate('/payments', { 
        state: { 
          paymentDetails: {
            id: requestData.id,
            name: 'Team Rebrand',
            description: `Rebrand team from "${team?.name}" to "${newTeamName}"`,
            amount: itemData.current_price,
            item_id: '1006',
            request_id: requestData.id,
            teamId: teamId,
            captainId: user?.id,
            referenceId: referenceId,
            type: 'team_rebrand'
          }
        }
      });
      
      // Close the confirmation modal
      setTeamRebrandConfirmation({show: false, step: 1});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTeamRebrandConfirmation({show: false, step: 1});
    }
  };

  // Load prices from items table
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('item_id, current_price')
          .in('item_id', ['1002', '1005', '1006', '1007']);
          
        if (error) throw error;
        
        if (data) {
          const teamTransferItem = data.find(item => item.item_id === '1002');
          const rosterChangeItem = data.find(item => item.item_id === '1005');
          const teamRebrandItem = data.find(item => item.item_id === '1006');
          const onlineIdChangeItem = data.find(item => item.item_id === '1007');
          
          if (teamTransferItem) setTeamTransferPrice(teamTransferItem.current_price);
          if (rosterChangeItem) setRosterChangePrice(rosterChangeItem.current_price);
          if (teamRebrandItem) setTeamRebrandPrice(teamRebrandItem.current_price);
          if (onlineIdChangeItem) setOnlineIdChangePrice(onlineIdChangeItem.current_price);
        }
      } catch (err) {
        console.error('Error fetching prices:', err);
      }
    };
    
    fetchPrices();
  }, []);

  // Load available players for roster changes
  useEffect(() => {
    const fetchAvailablePlayers = async () => {
      if (!showRosterChangeModal) return;
      
      try {
        const { data, error } = await supabase
          .from('players')
          .select('user_id, display_name, avatar_url')
          .not('user_id', 'in', members.map(m => m.id));
          
        if (error) throw error;
        
        if (data) {
          setAvailablePlayers(data.map(player => ({
            id: player.user_id,
            display_name: player.display_name,
            avatar_url: player.avatar_url,
            role: 'player',
            jersey_number: null,
            can_be_deleted: true
          })));
        }
      } catch (err) {
        console.error('Error fetching available players:', err);
      }
    };
    
    fetchAvailablePlayers();
  }, [showRosterChangeModal, members]);

  // Fetch available events when modals are opened
  useEffect(() => {
    const fetchEvents = async () => {
      if (!showRosterChangeModal && !showOnlineIdChangeModal) return;
      
      try {
        // Fetch tournaments
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('id, name')
          .eq('status', 'active');
          
        if (tournamentError) throw tournamentError;
        
        // Fetch leagues
        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select('id, name')
          .eq('status', 'active');
          
        if (leagueError) throw leagueError;
        
        const events = [
          ...(tournamentData || []).map(t => ({ 
            id: `tournament_${t.id}`, 
            name: t.name, 
            type: 'tournament' as const 
          })),
          ...(leagueData || []).map(l => ({ 
            id: `league_${l.id}`, 
            name: l.name, 
            type: 'league' as const 
          }))
        ];
        
        setAvailableEvents(events);
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    };
    
    fetchEvents();
  }, [showRosterChangeModal, showOnlineIdChangeModal]);

  // Initialize form data when team rebrand modal is opened
  useEffect(() => {
    if (showTeamRebrandModal && team) {
      setNewTeamName(team.name || '');
      setNewTeamTag(team.team_tag || '');
      setNewTeamDescription(team.description || '');
    }
  }, [showTeamRebrandModal, team]);

  // Add this function to process the payment result and complete the transfer
  const completeTeamTransfer = async (requestId: string, status: 'completed' | 'failed') => {
    try {
      // First update the request status
      const { data: requestData, error: updateError } = await supabase
        .from('team_change_requests')
        .update({ status: status })
        .eq('id', requestId)
        .select()
        .single();
      
      if (updateError) throw new Error('Error updating request status: ' + updateError.message);
      
      // If payment was successful, execute the transfer
      if (status === 'completed' && requestData) {
        // Get the new captain ID from the request
        const newCaptainId = requestData.player_id;
        
        // Execute the transfer using RPC
        const { error: transferError } = await supabase.rpc('transfer_team_ownership', {
          p_team_id: teamId,
          p_new_captain_id: newCaptainId
        });
        
        if (transferError) throw new Error('Error transferring ownership: ' + transferError.message);
        
        // Refresh the team data to show the new captain
        fetchTeamData();
        setSuccessMessage('Team ownership transferred successfully!');
      } else if (status === 'failed') {
        setError('Payment failed. Team ownership was not transferred.');
      }
    } catch (err) {
      console.error('Error completing transfer:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during transfer completion');
    }
  };

  // Add this effect to handle payment returns
  useEffect(() => {
    // Check if we're returning from a payment
    const location = window.location;
    const params = new URLSearchParams(location.search);
    
    const paymentStatus = params.get('status');
    const requestId = params.get('requestId');
    
    if (paymentStatus && requestId) {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, location.pathname);
      
      // Process the payment result
      if (paymentStatus === 'success') {
        completeTeamTransfer(requestId, 'completed');
      } else if (paymentStatus === 'failed') {
        completeTeamTransfer(requestId, 'failed');
      }
    }
  }, []);

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
    <div className="bg-gray-900 min-h-screen p-8 relative">
      {/* Background image and overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2940" 
          alt="Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-gray-900/95"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-md mb-4">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-2 rounded-md mb-4">
            {successMessage}
          </div>
        )}
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
                      aria-label="Edit team information"
                      title="Edit team information"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation({ type: 'disband', show: true, step: 1 })}
                      className="text-red-500 hover:text-red-400"
                      aria-label="Disband team"
                      title="Disband team"
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

              {/* Grid for Free Agency and Front Office side by side */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Free Agency Section */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Free Agency</h2>
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
                          {member.can_be_deleted && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-500 hover:text-red-400"
                              aria-label={`Remove ${member.display_name}`}
                              title={`Remove ${member.display_name}`}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Front Office Section */}
                {isCaptain && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Front Office</h2>
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        onClick={() => setShowRosterChangeModal(true)}
                        className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <Users className="w-5 h-5 text-green-500" />
                          </div>
                          <span className="text-white">Roster Change</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-green-500" />
                      </button>
                      
                      <button
                        onClick={() => setShowOnlineIdChangeModal(true)}
                        className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <UserCog className="w-5 h-5 text-green-500" />
                          </div>
                          <span className="text-white">Online ID Change</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-green-500" />
                      </button>
                      
                      <button
                        onClick={() => setShowTeamRebrandModal(true)}
                        className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <Paintbrush className="w-5 h-5 text-green-500" />
                          </div>
                          <span className="text-white">Team Rebrand</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-green-500" />
                      </button>
                      
                      <button
                        onClick={() => setDeleteConfirmation({ type: 'transfer', show: true, step: 1 })}
                        className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <UserPlus className="w-5 h-5 text-green-500" />
                          </div>
                          <span className="text-white">Transfer Ownership</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-green-500" />
                      </button>
                    </div>
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
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Transfer Team Ownership</h3>
                      
                      <div className="mb-4">
                        <label className="block text-gray-300 mb-2">
                          Select New Team Captain
                        </label>
                        <div className="mb-2">
                          <input
                            type="text"
                            className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                            placeholder="Search players..."
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                          />
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto bg-gray-700 rounded-md mb-4">
                          {members
                            .filter(member => 
                              member.role !== 'captain' && 
                              member.display_name.toLowerCase().includes(playerSearchQuery.toLowerCase())
                            )
                            .map(member => (
                              <div 
                                key={member.id}
                                className={`flex items-center p-2 hover:bg-gray-600 cursor-pointer ${
                                  deleteConfirmation.targetId === member.id ? 'bg-gray-600' : ''
                                }`}
                                onClick={() => setDeleteConfirmation({
                                  ...deleteConfirmation,
                                  targetId: member.id
                                })}
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden mr-2">
                                  {member.avatar_url ? (
                                    <img 
                                      src={member.avatar_url} 
                                      alt={member.display_name}
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <User2 className="w-8 h-8 p-1 text-green-500" />
                                  )}
                                </div>
                                <span className="text-white">{member.display_name}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {deleteConfirmation.targetId && (
                        <div className="text-center mb-6">
                          <p className="text-gray-300 mb-2">
                            You are requesting to relinquish control of <span className="font-bold text-red-500">{team?.name}</span> to <span className="font-bold text-green-500">{members.find(m => m.id === deleteConfirmation.targetId)?.display_name}</span> for <span className="font-bold text-white">${teamTransferPrice} USD</span>.
                          </p>
                        </div>
                      )}
                      
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => setDeleteConfirmation({ ...deleteConfirmation, step: 2 })}
                          disabled={!deleteConfirmation.targetId}
                          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
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
                        Type "<span className="font-bold text-white">{team?.name}</span>" to confirm the ownership transfer.
                      </p>
                      <input
                        type="text"
                        className="w-full bg-gray-700 border-gray-600 rounded-md mb-4 px-4 py-2 text-white"
                        placeholder={`Type ${team?.name}`}
                        onChange={(e) => {
                          if (e.target.value === team?.name && deleteConfirmation.targetId) {
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

        {/* Roster Change Modal */}
        {showRosterChangeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Roster Change Request</h3>
              
              <div className="mb-4">
                <label htmlFor="rosterEventSelect" className="block text-gray-300 mb-2">
                  Select Tournament/League
                </label>
                <select
                  id="rosterEventSelect"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                  value={selectedRosterEvent || ''}
                  onChange={(e) => setSelectedRosterEvent(e.target.value)}
                >
                  <option value="">Select Tournament/League</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} ({event.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="playerSearch" className="block text-gray-300 mb-2">
                  Search Players
                </label>
                <input
                  id="playerSearch"
                  type="text"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white mb-2"
                  placeholder="Search by name..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                />
                
                <div className="max-h-40 overflow-y-auto bg-gray-700 rounded-md">
                  {availablePlayers
                    .filter(player => 
                      player.display_name.toLowerCase().includes(playerSearchQuery.toLowerCase())
                    )
                    .map(player => (
                      <div 
                        key={player.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-600 cursor-pointer"
                        onClick={() => handleRosterPlayerSelect(player)}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden mr-2">
                            {player.avatar_url ? (
                              <img 
                                src={player.avatar_url} 
                                alt={player.display_name}
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <User2 className="w-8 h-8 p-1 text-green-500" />
                            )}
                          </div>
                          <span className="text-white">{player.display_name}</span>
                        </div>
                        {selectedRosterPlayers.some(p => p.id === player.id) && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-white mb-2">Selected Players:</h4>
                <div className="space-y-2">
                  {selectedRosterPlayers.map(player => (
                    <div 
                      key={player.id}
                      className="flex items-center justify-between bg-gray-700 p-2 rounded-md"
                    >
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden mr-2">
                          {player.avatar_url ? (
                            <img 
                              src={player.avatar_url} 
                              alt={player.display_name}
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <User2 className="w-6 h-6 p-1 text-green-500" />
                          )}
                        </div>
                        <span className="text-white">{player.display_name}</span>
                      </div>
                      <button
                        aria-label={`Remove ${player.display_name}`}
                        onClick={() => handleRemoveRosterPlayer(player.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="text-gray-300">Total: <span className="text-white font-bold">${rosterChangePrice}</span></p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setShowRosterChangeModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRosterChangeSubmit}
                  disabled={!selectedRosterEvent || selectedRosterPlayers.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Online ID Change Modal */}
        {showOnlineIdChangeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Online ID Change Request</h3>
              
              <div className="mb-4">
                <label htmlFor="onlineIdEventSelect" className="block text-gray-300 mb-2">
                  Select Tournament/League
                </label>
                <select
                  id="onlineIdEventSelect"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                  value={selectedOnlineIdEvent || ''}
                  onChange={(e) => setSelectedOnlineIdEvent(e.target.value)}
                >
                  <option value="">Select Tournament/League</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} ({event.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="playerSelect" className="block text-gray-300 mb-2">
                  Select Player
                </label>
                <select
                  id="playerSelect"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                  value={selectedPlayerId || ''}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                >
                  <option value="">Select Player</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="newOnlineId" className="block text-gray-300 mb-2">
                  New Online ID
                </label>
                <input
                  id="newOnlineId"
                  type="text"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                  placeholder="Enter new online ID"
                  value={newOnlineId}
                  onChange={(e) => setNewOnlineId(e.target.value)}
                />
              </div>

              <div className="text-center mb-4">
                <p className="text-gray-300">Total: <span className="text-white font-bold">${onlineIdChangePrice}</span></p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setShowOnlineIdChangeModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOnlineIdChangeSubmit}
                  disabled={!selectedOnlineIdEvent || !selectedPlayerId || !newOnlineId}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Rebrand Modal */}
        {showTeamRebrandModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Team Rebrand Request</h3>
              
              <div className="mb-4">
                <label htmlFor="newTeamName" className="block text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  id="newTeamName"
                  type="text"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                  placeholder="Enter team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="newTeamTag" className="block text-gray-300 mb-2">
                  Team Tag (3 letters)
                </label>
                <input
                  id="newTeamTag"
                  type="text"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                  placeholder="Enter 3-letter tag"
                  value={newTeamTag}
                  onChange={(e) => {
                    if (e.target.value.length <= 3) {
                      setNewTeamTag(e.target.value.toUpperCase());
                    }
                  }}
                  maxLength={3}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="newTeamLogo" className="block text-gray-300 mb-2">
                  Team Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-md overflow-hidden">
                    {newTeamLogoPreview ? (
                      <img
                        src={newTeamLogoPreview}
                        alt="Team Logo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : team?.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt="Current Team Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <input
                    id="newTeamLogo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    ref={logoInputRef}
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-1 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                  >
                    Select Image
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="newTeamDescription" className="block text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="newTeamDescription"
                  className="w-full bg-gray-700 border-gray-600 rounded-md px-4 py-2 text-white"
                  placeholder="Enter team description"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="text-center mb-4">
                <p className="text-gray-300">Total: <span className="text-white font-bold">${teamRebrandPrice}</span></p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setShowTeamRebrandModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTeamRebrandSubmit}
                  disabled={!newTeamName || !newTeamTag || newTeamTag.length !== 3}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Roster Change Confirmation Modal */}
        {rosterChangeConfirmation.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              {rosterChangeConfirmation.step === 1 ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Confirm Roster Change</h3>
                  
                  <p className="text-gray-300 mb-4">
                    You are requesting to change the roster for <span className="font-bold text-red-500">{availableEvents.find(e => e.id === selectedRosterEvent)?.name}</span> with <span className="font-bold text-green-500">{selectedRosterPlayers.length} players</span> for <span className="font-bold text-white">${rosterChangePrice} USD</span>.
                  </p>
                  
                  <div className="mb-4">
                    <h4 className="text-white mb-2">Selected Players:</h4>
                    <div className="max-h-40 overflow-y-auto bg-gray-700 rounded-md p-2">
                      {selectedRosterPlayers.map(player => (
                        <div 
                          key={player.id}
                          className="flex items-center mb-2 bg-gray-600/50 p-2 rounded-md"
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden mr-2">
                            {player.avatar_url ? (
                              <img 
                                src={player.avatar_url} 
                                alt={player.display_name}
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <User2 className="w-6 h-6 p-1 text-green-500" />
                            )}
                          </div>
                          <span className="text-white">{player.display_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setRosterChangeConfirmation({...rosterChangeConfirmation, step: 2})}
                      className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => {
                        setRosterChangeConfirmation({show: false, step: 1});
                        setShowRosterChangeModal(true);
                      }}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-4">Final Confirmation</h3>
                  <p className="text-gray-300 mb-4">
                    Type "<span className="font-bold text-white">{availableEvents.find(e => e.id === selectedRosterEvent)?.name}</span>" to confirm the roster change.
                  </p>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border-gray-600 rounded-md mb-4 px-4 py-2 text-white"
                    placeholder={`Type ${availableEvents.find(e => e.id === selectedRosterEvent)?.name}`}
                    onChange={(e) => {
                      if (e.target.value === availableEvents.find(ev => ev.id === selectedRosterEvent)?.name) {
                        processRosterChangePayment();
                      }
                    }}
                  />
                  <button
                    onClick={() => setRosterChangeConfirmation({...rosterChangeConfirmation, step: 1})}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Online ID Change Confirmation Modal */}
        {onlineIdChangeConfirmation.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              {onlineIdChangeConfirmation.step === 1 ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Confirm Online ID Change</h3>
                  
                  <p className="text-gray-300 mb-4">
                    You are requesting to change the online ID for <span className="font-bold text-green-500">{members.find(m => m.id === selectedPlayerId)?.display_name}</span> to <span className="font-bold text-white">{newOnlineId}</span>.
                  </p>
                  
                  <div className="mb-4">
                    <h4 className="text-white mb-2">Current Online ID:</h4>
                    <p className="text-gray-300">{members.find(m => m.id === selectedPlayerId)?.online_id}</p>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setOnlineIdChangeConfirmation({...onlineIdChangeConfirmation, step: 2})}
                      className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setOnlineIdChangeConfirmation({show: false, step: 1})}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-4">Final Confirmation</h3>
                  <p className="text-gray-300 mb-4">
                    Type "<span className="font-bold text-white">{newOnlineId}</span>" to confirm the online ID change.
                  </p>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border-gray-600 rounded-md mb-4 px-4 py-2 text-white"
                    placeholder="Enter new online ID"
                    value={newOnlineId}
                    onChange={(e) => setNewOnlineId(e.target.value)}
                  />
                  <button
                    onClick={() => setOnlineIdChangeConfirmation({...onlineIdChangeConfirmation, step: 1})}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Rebrand Confirmation Modal */}
        {teamRebrandConfirmation.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              {teamRebrandConfirmation.step === 1 ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Confirm Team Rebrand</h3>
                  
                  <p className="text-gray-300 mb-4">
                    You are requesting to rebrand your team from <span className="font-bold text-red-500">"{team?.name}"</span> to <span className="font-bold text-green-500">"{newTeamName}"</span>.
                  </p>
                  
                  <div className="mb-4">
                    <h4 className="text-white mb-2">Current Team Information:</h4>
                    <ul className="list-disc pl-6">
                      <li>Name: <span className="font-bold">{team?.name}</span></li>
                      <li>Tag: <span className="font-bold">{team?.team_tag}</span></li>
                      <li>Logo URL: <span className="font-bold">{team?.logo_url}</span></li>
                      <li>Description: <span className="font-bold">{team?.description}</span></li>
                    </ul>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-white mb-2">New Team Information:</h4>
                    <ul className="list-disc pl-6">
                      <li>Name: <span className="font-bold">{newTeamName}</span></li>
                      <li>Tag: <span className="font-bold">{newTeamTag}</span></li>
                      <li>Logo URL: <span className="font-bold">{newTeamLogoPreview ? newTeamLogoPreview : 'No new logo uploaded'}</span></li>
                      <li>Description: <span className="font-bold">{newTeamDescription}</span></li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setTeamRebrandConfirmation({...teamRebrandConfirmation, step: 2})}
                      className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => {
                        setTeamRebrandConfirmation({show: false, step: 1});
                        setShowTeamRebrandModal(true);
                      }}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-4">Final Confirmation</h3>
                  <p className="text-gray-300 mb-4">
                    Type "<span className="font-bold text-white">{newTeamName}</span>" to confirm the rebrand.
                  </p>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border-gray-600 rounded-md mb-4 px-4 py-2 text-white"
                    placeholder="Enter new team name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                  <button
                    onClick={() => setTeamRebrandConfirmation({...teamRebrandConfirmation, step: 1})}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboard;