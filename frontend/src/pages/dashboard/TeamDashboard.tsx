import React, { useState, useEffect, useMemo } from 'react'; // Add useMemo
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Edit, UserPlus, Trash, RefreshCw, DollarSign, Users, Trophy, UserCog, Paintbrush, ChevronRight } from 'lucide-react';
import { DbTeam, DbTeamMember } from '../../types/database';
import { createPaymentDetails, generateReferenceId } from '../../utils/paymentUtils';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';
import TeamActionProcessor from '../../components/TeamActionProcessor';
import EventRulesModal from '../../components/modals/EventRulesModal';
import RegistrationSummaryModal from '../../components/modals/RegistrationSummaryModal';
import PlayerSelectionForm from '../../components/registration/PlayerSelectionForm';
import { RequestService } from '../../services/RequestService'; // Use named import as suggested by TS error

// UI-specific interface that matches the team_players table structure
interface TeamMemberUI {
  id: string; // This will be set to user_id
  team_id: string;
  user_id: string;
  role: string;
  jersey_number: number | null;
  can_be_deleted: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    avatar_url?: string | null;
    online_id?: string | null; // This comes from the league_roster table
  };
}

// Interface for team data with UI-specific properties
interface TeamUI extends DbTeam {
  members: TeamMemberUI[];
}

// Cache for team data
const teamCache = new Map<string, {
  data: TeamUI;
  timestamp: number;
  expiresIn: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const TeamDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const requestService = useMemo(() => new RequestService(), []); // Instantiate the service

  const [team, setTeam] = useState<TeamUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [newOnlineId, setNewOnlineId] = useState('');
  const [isEditingOnlineId, setIsEditingOnlineId] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [leagueRosters, setLeagueRosters] = useState<any[]>([]);
  const [tournamentRosters, setTournamentRosters] = useState<any[]>([]);
  const [userOnRoster, setUserOnRoster] = useState(false);
  
  // Front Office state
  const [showFrontOffice, setShowFrontOffice] = useState(true);
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [itemPrices, setItemPrices] = useState<{[key: string]: number}>({});
  const [itemIds, setItemIds] = useState<{[key: string]: string}>({});
  
  // Confirmation dialog states
  const [showOnlineIdConfirmation, setShowOnlineIdConfirmation] = useState(false);
  const [showRebrandConfirmation, setShowRebrandConfirmation] = useState(false);
  
  // Add new state variables for player signing
  const [showPlayerSigningForm, setShowPlayerSigningForm] = useState(false);
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [signingError, setSigningError] = useState<string | null>(null);
  
  // Add new state for player signing confirmation
  const [showPlayerSigningConfirmation, setShowPlayerSigningConfirmation] = useState(false);

  // Action processor states
  const [showTeamRebrandProcessor, setShowTeamRebrandProcessor] = useState(false);
  const [showOnlineIdProcessor, setShowOnlineIdProcessor] = useState(false);
  const [showLeagueRegistrationProcessor, setShowLeagueRegistrationProcessor] = useState(false);
  const [showTournamentRegistrationProcessor, setShowTournamentRegistrationProcessor] = useState(false);
  const [showRosterChangeProcessor, setShowRosterChangeProcessor] = useState(false);
  const [showTeamTransferProcessor, setShowTeamTransferProcessor] = useState(false);
  // State for new Registration Flow
  const [currentRegistrationType, setCurrentRegistrationType] = useState<'league' | 'tournament' | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState<any[]>([]); // Add state for full player details

  // --- Registration Flow Handlers ---

  const handleStartTournamentRegistration = async (): Promise<void> => {
    // TODO: Implement logic to select a specific tournament if multiple are available.
    // For now, assume we use the first available one.
    if (availableTournaments.length === 0) {
      setError("No tournaments currently available for registration.");
      return;
    }
    // TODO: Allow selection if multiple tournaments exist
    const tournamentToRegister = availableTournaments[0]; // Using the first one for now

    try {
      setLoading(true); // Indicate loading while fetching details
      setError(null);

      // Fetch detailed tournament info (rules, dates etc.) - Assuming an endpoint/service exists
      // Fetch detailed tournament info using RequestService
      // Assuming RequestService has a method like fetchTournamentDetails
      // and it returns an object with { id, name, rules, registrationStartDate, startDate, registrationFee }
      console.log(`Fetching details for tournament ID: ${tournamentToRegister.id}`);
      const details = await requestService.fetchTournamentDetails(tournamentToRegister.id); // Use instance

      // Add fallback for registrationFee if not returned by API, using itemPrices
      if (details && details.registrationFee === undefined) {
          details.registrationFee = tournamentToRegister.payment_amount ?? itemPrices['TOURNAMENT_REGISTRATION'] ?? 25.00;
      }

      if (!details) {
        throw new Error("Tournament details could not be loaded.");
      }

      setSelectedEventDetails(details);
      setCurrentRegistrationType('tournament');
      setIsRulesModalOpen(true);

    } catch (err: any) {
      console.error("Error fetching tournament details:", err);
      setError(`Failed to load tournament details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLeagueRegistration = async (): Promise<void> => {
     // TODO: Implement similar logic for leagues, allowing selection if multiple exist.
     if (availableLeagues.length === 0) {
       setError("No leagues currently available for registration.");
       return;
     }
     const leagueToRegister = availableLeagues[0]; // Using the first one for now

     try {
       setLoading(true);
       setError(null);
       // Fetch league details using RequestService
       // Assuming RequestService has a method like fetchLeagueDetails
       // and it returns an object with { id, name, rules, registrationStartDate, startDate, playoffStartDate, registrationFee }
       console.log(`Fetching details for league ID: ${leagueToRegister.id}`);
       const details = await requestService.fetchLeagueDetails(leagueToRegister.id); // Use instance

       // Add fallback for registrationFee if not returned by API, using itemPrices
       if (details && details.registrationFee === undefined) {
           details.registrationFee = leagueToRegister.payment_amount ?? itemPrices['LEAGUE_REGISTRATION'] ?? 50.00;
       }

       if (!details) {
         throw new Error("League details could not be loaded.");
       }

       setSelectedEventDetails(details);
       setCurrentRegistrationType('league');
       setIsRulesModalOpen(true);

     } catch (err: any) {
       console.error("Error fetching league details:", err);
       setError(`Failed to load league details: ${err.message}`);
     } finally {
       setLoading(false);
     }
  };
  // Handler for confirming rules and showing player selection
  const handleRulesConfirmed = () => {
    setIsRulesModalOpen(false);
    setIsPlayerSelectionVisible(true);
    // TODO: Add animation logic if desired
  };

  // Handler for canceling the rules modal
  const handleRulesCanceled = () => {
    setIsRulesModalOpen(false);
    setCurrentRegistrationType(null);
    setSelectedEventDetails(null);
  };

  // Handler for when player selection is complete
  const handleRosterComplete = async (playerIds: string[]) => { // Make async
    if (playerIds.length !== 5) {
        setError("Please select exactly 5 players.");
        // Potentially show a toast/alert instead of just setting error state
        return; // Keep player selection open
    }
    setSelectedPlayerIds(playerIds); // Store IDs immediately

    // Fetch full player details for the summary modal
    setLoading(true); // Use main loading state or a dedicated one
    setError(null);
    try {
      console.log("Fetching details for selected players:", playerIds);
      const { data: playersData, error: playersError } = await supabase
        .from('players') // Assuming player details are in 'players' table
        .select('user_id, display_name, avatar_url, online_id') // Select needed fields
        .in('user_id', playerIds); // Filter by selected IDs

      if (playersError) throw playersError;

      console.log("Fetched player details:", playersData);
      // Map to ensure structure matches what modal expects, e.g., { id: ..., username: ... }
      const details = (playersData || []).map(p => ({
          id: p.user_id,
          username: p.display_name || `Player ${p.user_id.substring(0,4)}`,
          // Add other fields if needed by the modal
      }));
      setSelectedPlayerDetails(details);

      // Only proceed to summary modal if fetch was successful
      setIsPlayerSelectionVisible(false);
      setIsSummaryModalOpen(true);

    } catch (err: any) {
        console.error("Error fetching selected player details:", err);
        setError(`Failed to load player details for summary: ${err.message}`);
        // Don't open summary modal on error
        setSelectedPlayerDetails([]); // Clear details on error
    } finally {
        setLoading(false);
    }
  };

   // Handler for canceling the player selection form
  const handlePlayerSelectionCanceled = () => {
    setIsPlayerSelectionVisible(false);
    setCurrentRegistrationType(null);
    setSelectedEventDetails(null);
    setSelectedPlayerIds([]); // Clear selected players
  };

  // Handler for confirming the summary and proceeding to payment
  const handleSummaryConfirmed = async () => {
    setIsSummaryModalOpen(false); // Close summary modal immediately
    if (!team || !user || !selectedEventDetails || !currentRegistrationType) {
      setError("Missing required data to proceed with registration.");
      return;
    }

    const isTournament = currentRegistrationType === 'tournament';
    const requestType = isTournament ? 'tournament_registration' : 'league_registration';
    const eventId = selectedEventDetails.id;
    const eventName = selectedEventDetails.name;
    const priceKey = isTournament ? 'TOURNAMENT_REGISTRATION' : 'LEAGUE_REGISTRATION';
    const defaultPrice = isTournament ? 25.00 : 50.00;
    const defaultItemId = isTournament ? '1003' : '1004';

    try {
      setProcessingPayment(true); // Indicate processing START
      setError(null);

      const price = selectedEventDetails.registrationFee ?? itemPrices[priceKey] ?? defaultPrice;
      const itemId = itemIds[priceKey] || defaultItemId; // Use fetched item ID if available
      const requestId = uuidv4();

      console.log(`Starting ${requestType} process:`);
      console.log(`  Event ID: ${eventId}, Event Name: ${eventName}`);
      console.log(`  Team ID: ${team.id}, Captain ID: ${user.id}`);
      console.log(`  Selected Players: ${selectedPlayerIds.join(', ')}`);
      console.log(`  Price: ${price}, Item ID: ${itemId}, Request ID: ${requestId}`);

      // 1. Create Payment Details
      const referenceId = generateReferenceId(
        itemId,
        team?.id,
        user?.id,
        eventId,
        undefined, // playerId not needed here
        requestId
      );
      console.debug("[TeamDashboard] Generated referenceId:", referenceId);

      const paymentDetails = createPaymentDetails(
        currentRegistrationType, // 'league' or 'tournament'
        `${isTournament ? 'Tournament' : 'League'} Registration for ${eventName}`, // More specific description
        price,
        `Team: ${team.name}, Event: ${eventName}`, // Note for payment processor
        { // Data for payment processor metadata & potentially request creation
          teamId: team.id,
          captainId: user.id, // Keep captainId if needed by payment processor/backend
          eventId: eventId,
          item_id: itemId, // Use the specific item ID
          playersIds: selectedPlayerIds, // Pass selected players
          request_id: requestId, // Crucial for linking payment and request
          referenceId: referenceId, // Use the generated reference ID
          season: selectedEventDetails?.season || selectedEventDetails?.current_season || 1 // Pass season number
        } as any
      );

      // Add metadata specifically structured for the team_change_requests table
      // This aligns with dev_notes.md structure
      paymentDetails.metadata = {
        ...paymentDetails.metadata, // Keep existing payment metadata
        requestType: requestType, // For backend routing/identification
        eventName: eventName,
        teamName: team.name,
        playerIds: selectedPlayerIds, // Ensure player IDs are here
        season: selectedEventDetails?.season || selectedEventDetails?.current_season || 1, // Explicitly include season
        requestId: requestId, // Explicitly include requestId
        teamId: team.id, // Explicitly include teamId
        // Nested data specifically for the change request record itself
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          [isTournament ? 'tournamentId' : 'leagueId']: eventId, // Correctly set event ID field
          oldValue: '', // Not applicable for registration
          newValue: eventId, // Store event ID as new value? Or maybe roster? TBD by backend needs.
          requestId: requestId, // Link back to the request
          metadata: { // Metadata specific to the request record
            eventName: eventName,
            teamName: team.name,
            playerIds: selectedPlayerIds,
            requestId: requestId, // Redundant but ensures it's present
            season: selectedEventDetails?.season || selectedEventDetails?.current_season || 1 // Also include inside nested metadata
          }
        }
      };

      console.log("Payment Details:", JSON.stringify(paymentDetails, null, 2));

      // 2. Navigate to Payment Page
       navigate('/payments', {
         state: {
           paymentDetails,
           // Tell payment page what kind of request to create on success
           changeRequestType: requestType,
           // Pass options needed by createTeamChangeRequest on the payment success callback
           changeRequestOptions: {
             [isTournament ? 'tournamentId' : 'leagueId']: eventId,
             metadata: paymentDetails.metadata.changeRequestData.metadata, // Pass nested metadata
             requestId: requestId, // Pass the generated request ID
             // playerIds are in metadata, no need to pass separately unless createTeamChangeRequest needs them directly
           }
         }
       });

      // Reset state *after* successful navigation initiation
      // Note: Actual processing state should be handled based on payment page result
      // setProcessingPayment(false); // Move this logic
      setCurrentRegistrationType(null);
      setSelectedEventDetails(null);
      setSelectedPlayerIds([]);

    } catch (err: any) {
      console.error(`Error during ${requestType} confirmation:`, err);
      setError(`Failed to initiate registration: ${err.message}`);
      setProcessingPayment(false); // Ensure processing stops on error
    }
  };

   // Handler for canceling the summary modal
  const handleSummaryCanceled = () => {
    setIsSummaryModalOpen(false);
    // Reset state to allow restarting the flow cleanly
    setCurrentRegistrationType(null);
    setSelectedEventDetails(null);
    setSelectedPlayerIds([]);
    setIsPlayerSelectionVisible(false); // Hide player selection too
  };


  // --- End Registration Flow Handlers ---

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isPlayerSelectionVisible, setIsPlayerSelectionVisible] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(null); // Use a more specific type if available
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchTeamData();
      fetchAvailableEvents();
      fetchItemPrices();
    }
  }, [user]);

  const fetchTeamData = async () => {
    let teamId: string | null = null;

    try {
      setLoading(true);
      setError(null);

      // Parse UUID from URL
      const urlPathSegments = window.location.pathname.split('/');
      const teamIdIndex = urlPathSegments.findIndex(segment => segment === 'team') + 1;
      const teamIdFromUrl = teamIdIndex < urlPathSegments.length ? urlPathSegments[teamIdIndex] : null;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!teamIdFromUrl || !uuidRegex.test(teamIdFromUrl)) {
        console.error('Invalid team ID in URL:', teamIdFromUrl);
        setError('Invalid team ID');
        setLoading(false);
        return;
      }

      // Store teamId for later use
      teamId = teamIdFromUrl;

      // Check cache first
      const cached = teamCache.get(teamId);
      const now = Date.now();
      if (cached && now - cached.timestamp < cached.expiresIn) {
        console.log('Using cached team data');
        setTeam(cached.data);
        setIsCaptain(cached.data.captain_id === user?.id);
        setNewTeamName(cached.data.name);
        setLoading(false);
        return;
      }

      console.log('Fetching team data for ID:', teamId);

      // Fetch all data in parallel
      const [
        { data: teamData, error: teamError },
        { data: membersData, error: membersError },
        { data: leagueRosterData, error: leagueRosterError },
        { data: tournamentRosterData, error: tournamentRosterError }
      ] = await Promise.all([
        // Team data
        supabase
          .from('teams')
          .select(`
            *,
            players:captain_id (
              user_id,
              display_name,
              email,
              avatar_url
            )
          `)
          .eq('id', teamIdFromUrl)
          .single(),

        // Team members with player data
        supabase
          .from('team_players')
          .select(`
            *,
            players (
              user_id,
              display_name,
              email,
              avatar_url
            )
          `)
          .eq('team_id', teamIdFromUrl),

        // League roster with player data
        supabase
          .from('league_roster')
          .select(`
            *,
            players (
              user_id,
              display_name,
              email,
              avatar_url
            )
          `)
          .eq('team_id', teamIdFromUrl),

        // Tournament roster with player data
        supabase
          .from('tournament_roster')
          .select(`
            *,
            players (
              user_id,
              display_name,
              email,
              avatar_url
            )
          `)
          .eq('team_id', teamIdFromUrl)
      ]);

      // Handle errors
      if (teamError) throw teamError;
      if (membersError) throw membersError;
      if (leagueRosterError) throw leagueRosterError;
      if (tournamentRosterError) throw tournamentRosterError;

      if (!teamData) {
        throw new Error('Team not found');
      }

      // Transform team data
      const enhancedTeamMembers = (membersData || []).map(member => ({
        ...member,
        id: member.user_id,
        user: member.players ? {
          id: member.players.user_id,
          username: member.players.display_name,
          email: member.players.email,
          avatar_url: member.players.avatar_url
        } : {
          id: member.user_id,
          username: `Player ${member.user_id.substring(0, 8)}`,
          email: '',
          avatar_url: null
        }
      }));

      // Transform league roster data
      const enhancedLeagueRosterData = (leagueRosterData || []).map(roster => ({
        ...roster,
        user: roster.players ? {
          id: roster.players.user_id,
          user_name: roster.players.display_name,
          email: roster.players.email,
          avatar_url: roster.players.avatar_url
        } : null
      }));

      // Transform tournament roster data
      const enhancedTournamentRosterData = (tournamentRosterData || []).map(roster => ({
        ...roster,
        user: roster.players ? {
          id: roster.players.user_id,
          user_name: roster.players.display_name,
          email: roster.players.email,
          avatar_url: roster.players.avatar_url
        } : null
      }));

      // Combine all data
      const finalTeamData = {
        ...teamData,
        members: enhancedTeamMembers,
        captain: teamData.players ? {
          id: teamData.players.user_id,
          user_name: teamData.players.display_name,
          email: teamData.players.email,
          avatar_url: teamData.players.avatar_url
        } : null
      };

      // Cache the data
      teamCache.set(teamId, {
        data: finalTeamData,
        timestamp: now,
        expiresIn: CACHE_DURATION
      });

      // Check if user is on any roster
      const userOnAnyRoster = 
        enhancedLeagueRosterData.some(roster => roster.player_id === user?.id) || 
        enhancedTournamentRosterData.some(roster => roster.player_id === user?.id);

      // Update state
      setTeam(finalTeamData);
      setIsCaptain(teamData.captain_id === user?.id);
      setUserOnRoster(userOnAnyRoster);
      setLeagueRosters(enhancedLeagueRosterData);
      setTournamentRosters(enhancedTournamentRosterData);
      setNewTeamName(teamData.name);

    } catch (error) {
      console.error('Error in fetchTeamData:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      // Clear cache on error
      if (teamId) {
        teamCache.delete(teamId);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      // Fetch available tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id, name, status, payment_amount')
        .eq('status', 'registration')
        .order('name');
        
      if (!tournamentsError && tournamentsData) {
        setAvailableTournaments(tournamentsData);
      } else {
        console.error('Error fetching tournaments:', tournamentsError);
      }
      
      // Fetch available leagues
      const { data: leaguesData, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name, status, payment_amount')
        .eq('status', 'active')
        .order('name');
        
      if (!leaguesError && leaguesData) {
        setAvailableLeagues(leaguesData);
      } else {
        console.error('Error fetching leagues:', leaguesError);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };
  
  const fetchItemPrices = async () => {
    try {
      // Fetch prices from the correct 'items' table
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('id, item_name, item_id, current_price, item_description')
        .eq('enabled', true);
        
      if (itemsError) throw itemsError;
      
      // Transform the data to a more usable format
      const prices: {[key: string]: number} = {};
      const ids: {[key: string]: string} = {};
      
      itemsData?.forEach(item => {
        // Use uppercase keys with underscores to match with TeamActionProcessor
        let key = '';
        
        // Map item names to standardized keys
        switch(item.item_name) {
          case 'Team Rebrand':
            key = 'TEAM_REBRAND';
            break;
          case 'League Registration':
            key = 'LEAGUE_REGISTRATION';
            break;
          case 'Tournament Registration':
            key = 'TOURNAMENT_REGISTRATION';
            break;
          case 'Roster Change':
            key = 'ROSTER_CHANGE';
            break;
          case 'Gamer Tag Change':
            key = 'ONLINE_ID_CHANGE';
            break;
          case 'Team Transfer':
            key = 'TEAM_TRANSFER';
            break;
          default:
            key = item.item_name;
        }
        
        prices[key] = item.current_price;
        ids[key] = item.item_id;
      });
      
      // Set default prices if none were fetched
      if (Object.keys(prices).length === 0) {
        prices['TEAM_REBRAND'] = 20.00;
        prices['LEAGUE_REGISTRATION'] = 50.00;
        prices['TOURNAMENT_REGISTRATION'] = 25.00;
        prices['ROSTER_CHANGE'] = 10.00;
        prices['ONLINE_ID_CHANGE'] = 5.00;
        prices['TEAM_TRANSFER'] = 15.00;
        
        ids['TEAM_REBRAND'] = '1006';
        ids['LEAGUE_REGISTRATION'] = '1004';
        ids['TOURNAMENT_REGISTRATION'] = '1003';
        ids['ROSTER_CHANGE'] = '1002';
        ids['ONLINE_ID_CHANGE'] = '1005';
        ids['TEAM_TRANSFER'] = '1001';
      }
      
      setItemPrices(prices);
      setItemIds(ids);
    } catch (error) {
      console.error('Error fetching item prices:', error);
      // Set default prices if an error occurred
      setItemPrices({
        'TEAM_REBRAND': 20.00,
        'LEAGUE_REGISTRATION': 50.00,
        'TOURNAMENT_REGISTRATION': 25.00,
        'ROSTER_CHANGE': 10.00,
        'ONLINE_ID_CHANGE': 5.00,
        'TEAM_TRANSFER': 15.00
      });
      
      setItemIds({
        'TEAM_REBRAND': '1006',
        'LEAGUE_REGISTRATION': '1004',
        'TOURNAMENT_REGISTRATION': '1003',
        'ROSTER_CHANGE': '1002',
        'ONLINE_ID_CHANGE': '1005',
        'TEAM_TRANSFER': '1001'
      });
    }
  };

  const createTeamChangeRequest = async (
    requestType: string,
    teamId: string,
    requestedBy: string,
    itemId: string,
    paymentId: string,
    options: {
      tournamentId?: string;
      leagueId?: string;
      playerId?: string;
      oldValue?: string;
      newValue?: string;
      metadata?: Record<string, any>;
      requestId?: string; // Add optional requestId parameter
    }
  ) => {
    try {
      const { tournamentId, leagueId, playerId, oldValue, newValue, metadata, requestId } = options;
      
      // Generate a UUID for the request ID if not provided
      const finalRequestId = requestId || uuidv4();
      
      console.log(`Creating team change request with ID: ${finalRequestId}`);
      console.log(`Team ID: ${teamId}`);
      if (playerId) console.log(`Player ID: ${playerId}`);
      console.log(`Payment ID (reference only): ${paymentId}`);
      console.log(`Using formatted item ID: ${itemId}`);
      
      const { data, error } = await supabase
        .from('team_change_requests')
        .insert({
          id: finalRequestId, // Use provided requestId or generate one
          team_id: teamId,
          request_type: requestType,
          requested_by: requestedBy,
          tournament_id: tournamentId,
          league_id: leagueId,
          player_id: playerId,
          old_value: oldValue,
          new_value: newValue,
          status: 'processing', // Change from 'pending' to 'processing' to trigger immediate processing
          payment_id: null, // Set to null initially
          payment_reference: paymentId, // Store payment ID in a separate field for reference
          item_id: itemId,
          metadata
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating team change request:', error);
        return null;
      }
      
      console.log('Team change request created:', data);
      return data;
    } catch (err) {
      console.error('Error creating team change request:', err);
      return null;
    }
  };

  const handleEditTeamName = () => {
    // Show the team rebrand processor instead of setting isEditingName
    setShowTeamRebrandProcessor(true);
  };

  // Handle success from team rebrand request
  const handleRebrandSuccess = (response: any) => {
    console.log('Team rebrand successful:', response);
    setShowTeamRebrandProcessor(false);
    // Refresh team data to show the updated name
    fetchTeamData();
  };

  // Handle cancellation of team rebrand
  const handleRebrandCancel = () => {
    setShowTeamRebrandProcessor(false);
  };

  const handleEditOnlineId = (playerId: string) => {
    // Set the selected player ID and show the online ID processor
    setSelectedPlayerId(playerId);
    
    // Find the player's current online_id
    const player = team?.members.find(member => member.user_id === playerId);
    if (player) {
      // Get online_id from the user object
      const onlineId = player.user?.online_id || '';
      setNewOnlineId(onlineId);
    }
    
    setShowOnlineIdProcessor(true);
  };

  // Handle success from online ID change request
  const handleOnlineIdSuccess = (response: any) => {
    console.log('Online ID change successful:', response);
    setShowOnlineIdProcessor(false);
    setSelectedPlayerId(null);
    // Refresh team data to show the updated online ID
    fetchTeamData();
  };

  // Handle cancellation of online ID change
  const handleOnlineIdCancel = () => {
    setShowOnlineIdProcessor(false);
    setSelectedPlayerId(null);
  };

  const handleSaveTeamName = async () => {
    if (!team || !newTeamName.trim()) return;

    try {
      // Check if the name is different
      if (newTeamName === team.name) {
        setIsEditingName(false);
        return;
      }

      // If the name is different, we need to process a payment
      setShowRebrandConfirmation(true);
    } catch (err) {
      console.error(err);
      setError('Failed to update team name');
    }
  };

  const processTeamRebrandPayment = async () => {
    if (!team || !user || !newTeamName.trim()) return;
    
    try {
      setProcessingPayment(true);
      
      // Get the price from the itemPrices state
      const price = itemPrices['TEAM_REBRAND'] || 20.00; // Default to 20.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['TEAM_REBRAND'] || '1006'; // Use the fetched item_id or default to '1006'
      console.log('Using item ID from database for team rebrand:', itemId);
      
      // Create payment details for team rebranding
      const paymentDetails = createPaymentDetails(
        'team_rebrand',
        'Team Name Change',
        price,
        `Change team name from "${team.name}" to "${newTeamName}"`,
        {
          teamId: team.id,
          captainId: user.id,
          item_id: itemId,
          request_id: requestId
        }
      );
      
      // Add metadata for the team change request
      paymentDetails.metadata = {
        requestType: 'team_rebrand',
        oldTeamName: team.name,
        newTeamName: newTeamName,
        requestId: requestId,
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          oldValue: team.name,
          newValue: newTeamName,
          metadata: {
            oldTeamName: team.name,
            newTeamName: newTeamName
          }
        }
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          changeRequestType: 'team_rebrand'
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process payment for team name change');
      setProcessingPayment(false);
      setShowRebrandConfirmation(false);
    }
  };

  const handleSaveOnlineId = async () => {
    if (!selectedPlayerId || !newOnlineId.trim()) return;

    // Find the player
    const player = team?.members.find(member => member.user_id === selectedPlayerId);
    if (!player) return;

    // Check if the online ID is different
    if (player.user?.online_id === newOnlineId) {
      setIsEditingOnlineId(false);
      return;
    }

    // If the online ID is different, we need to process a payment
    setShowOnlineIdConfirmation(true);
  };

  const processOnlineIdChangePayment = async () => {
    if (!team || !user || !selectedPlayerId || !newOnlineId.trim()) return;
    
    try {
      setProcessingPayment(true);
      
      // Find the player in the members array
      const player = team.members.find(member => member.user_id === selectedPlayerId);
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Get the current online ID from the user object
      const currentOnlineId = player.user?.online_id || 'None';
      
      // Get the price from the itemPrices state
      const price = itemPrices['ONLINE_ID_CHANGE'] || 5.00; // Default to 5.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['ONLINE_ID_CHANGE'] || '1005'; // Use the fetched item_id or default to '1005'
      console.log('Using item ID from database for online ID change:', itemId);
      
      // Create payment details for online ID change
      const paymentDetails = createPaymentDetails(
        'online_id_change',
        'Online ID Change',
        price,
        `Change online ID from "${currentOnlineId}" to "${newOnlineId}"`,
        {
          teamId: team.id,
          captainId: user.id,
          playerId: selectedPlayerId,
          item_id: itemId,
          request_id: requestId
        }
      );
      
      // Add metadata for the team change request
      paymentDetails.metadata = {
        requestType: 'online_id_change',
        playerId: selectedPlayerId,
        playerName: player.user?.username || selectedPlayerId,
        oldOnlineId: currentOnlineId,
        newOnlineId: newOnlineId,
        requestId: requestId,
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          playerId: selectedPlayerId,
          oldValue: currentOnlineId,
          newValue: newOnlineId,
          metadata: {
            playerName: player.user?.username || selectedPlayerId,
            oldOnlineId: currentOnlineId,
            newOnlineId: newOnlineId
          }
        }
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          changeRequestType: 'online_id_change'
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process payment for online ID change');
      setProcessingPayment(false);
      setShowOnlineIdConfirmation(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!team) return;

    try {
      const { error } = await supabase
        .from('team_players')
        .delete()
        .eq('user_id', playerId)
        .eq('team_id', team.id);

      if (error) throw error;

      // Update the local state
      setTeam({
        ...team,
        members: team.members.filter(member => member.user_id === playerId ? false : true)
      });
    } catch (err) {
      console.error(err);
      setError('Failed to remove player from team');
    }
  };

  const handleAddPlayer = () => {
    if (!team) return;
    navigate('/dashboard/add-player', { state: { teamId: team.id } });
  };

  const handleJoinTournament = (tournamentId: string, tournamentName: string, price: number) => {
    if (!team || !user) return;
    
    try {
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['TOURNAMENT_REGISTRATION'] || '1003'; // Use the fetched item_id or default to '1003'
      console.log('Using item ID from database for tournament registration:', itemId);
      
      // Create payment details for tournament registration
      const paymentDetails = createPaymentDetails(
        'tournament',
        'Tournament Registration',
        price,
        `Registration for ${tournamentName}`,
        {
          teamId: team.id,
          captainId: user.id,
          eventId: tournamentId,
          item_id: itemId,
          playersIds: team.members.map(member => member.user_id),
          request_id: requestId
        }
      );

      // Add metadata for the registration, including changeRequestType and changeRequestData
      paymentDetails.changeRequestType = 'tournament_registration';
      paymentDetails.metadata = {
        requestType: 'tournament_registration',
        eventName: tournamentName,
        teamName: team.name,
        playerIds: team.members.map(member => member.user_id),
        requestId,
        teamId: team.id,
        tournamentId,
        season: 0,
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          tournamentId: tournamentId,
          oldValue: '',
          newValue: tournamentId,
          requestId: requestId,
          playerId: team.members.map(member => member.user_id), // Pass array of player IDs
          metadata: {
            eventName: tournamentName,
            teamName: team.name,
            playerIds: team.members.map(member => member.user_id),
            requestId: requestId,
            season: 0
          }
        }
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails
          // No changeRequestType as tournament registrations are handled by updateRegistrationStatus
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process tournament registration');
    }
  };
  
  const handleJoinLeague = (leagueId: string, leagueName: string, price: number) => {
    if (!team || !user) return;
    
    try {
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['LEAGUE_REGISTRATION'] || '1004'; // Use the fetched item_id or default to '1004'
      console.log('Using item ID from database for league registration:', itemId);
      
      // Create payment details for league registration
      const paymentDetails = createPaymentDetails(
        'league',
        'League Registration',
        price,
        `Registration for ${leagueName}`,
        {
          teamId: team.id,
          captainId: user.id,
          eventId: leagueId,
          item_id: itemId,
          playersIds: team.members.map(member => member.user_id), // Include all team members
          request_id: requestId
        }
      );
      
      // Add metadata for the registration
      paymentDetails.metadata = {
        leagueId,
        leagueName,
        teamId: team.id,
        teamName: team.name,
        requestId,
        // No need for changeRequestData as league registrations are handled differently
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails
          // No changeRequestType as league registrations are handled by updateRegistrationStatus
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process league registration');
    }
  };
  
  const handleTransferOwnership = (newCaptainId: string, newCaptainName: string) => {
    if (!team || !user) return;
    
    try {
      console.log('Starting team transfer process with the following data:');
      console.log('Team ID (UUID):', team.id);
      console.log('Current Captain ID (UUID):', user.id);
      console.log('New Captain ID (UUID):', newCaptainId);
      console.log('Team Name:', team.name);
      console.log('New Captain Name:', newCaptainName);
      
      // Get the price from the itemPrices state
      const price = itemPrices['TEAM_TRANSFER'] || 15.00; // Default to 15.00 if not found
      
      // Generate a unique request ID - THIS MUST BE USED CONSISTENTLY
      const requestId = uuidv4();
      console.log('Generated Request ID:', requestId);
      
      // Get the item_id from the database
      const itemId = itemIds['TEAM_TRANSFER'] || '1001'; // Use the fetched item_id or default to '1001'
      console.log('Using item ID from database:', itemId);
      
      // Create payment details for team transfer
      const paymentDetails = createPaymentDetails(
        'team_transfer',
        'Team Ownership Transfer',
        price,
        `Transfer ownership of ${team.name} to ${newCaptainName}`,
        {
          teamId: team.id,
          captainId: user.id,
          playerId: newCaptainId,
          item_id: itemId,
          request_id: requestId // IMPORTANT: Use the same request ID here
        }
      );
      
      console.log('Created payment details:', paymentDetails);
      
      // Add metadata for the team change request
      paymentDetails.metadata = {
        requestType: 'team_transfer',
        oldCaptainId: user.id,
        oldCaptainName: user.email, // Use email instead of username
        newCaptainId: newCaptainId,
        newCaptainName: newCaptainName,
        teamName: team.name,
        requestId: requestId, // Include the request ID in metadata
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          playerId: newCaptainId,
          oldValue: user.id,
          newValue: newCaptainId,
          requestId: requestId, // Include request ID in change request data
          metadata: {
            oldCaptainName: user.email,
            newCaptainName: newCaptainName,
            teamName: team.name,
            requestId: requestId // Also include it in nested metadata
          }
        }
      };
      
      console.log('Final payment details with metadata:', JSON.stringify(paymentDetails, null, 2));
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          // Don't include functions in the navigation state
          changeRequestType: 'team_transfer'
        }
      });
    } catch (err) {
      console.error('Error in handleTransferOwnership:', err);
      setError('Failed to process team transfer');
    }
  };

  const handlePlayerSigningRequest = () => {
    if (!team || !user) return;
    if (!playerEmail.trim() || !playerName.trim()) {
      setSigningError('Please provide both player email and name');
      return;
    }
    
    // Show confirmation dialog
    setSigningError(null);
    setShowPlayerSigningConfirmation(true);
  };

  const processPlayerSigningPayment = async () => {
    if (!team || !user || !playerEmail.trim() || !playerName.trim()) return;
    
    try {
      setProcessingPayment(true);
      
      // Get the price from the itemPrices state
      const price = itemPrices['ROSTER_CHANGE'] || 10.00; // Default to 10.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['ROSTER_CHANGE'] || '1002'; // Use the fetched item_id or default to '1002'
      console.log('Using item ID from database for player signing:', itemId);
      
      // Create payment details for player signing
      const paymentDetails = createPaymentDetails(
        'roster_change', // Changed to roster_change since there's no specific player_signing type
        'Player Signing Request',
        price,
        `Request to sign ${playerName} (${playerEmail}) to ${team.name}`,
        {
          teamId: team.id,
          captainId: user.id,
          item_id: itemId,
          request_id: requestId,
          playersIds: [] // Empty array since we don't have player IDs yet
        }
      );
      
      // Add player email and name to the metadata
      paymentDetails.metadata = {
        playerEmail,
        playerName,
        requestId,
        requestType: 'player_signing',
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          oldValue: '',
          newValue: playerEmail,
          metadata: {
            playerEmail,
            playerName,
            teamName: team.name
          }
        }
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          changeRequestType: 'roster_change'
        }
      });
    } catch (err) {
      console.error(err);
      setSigningError('Failed to process player signing request');
      setProcessingPayment(false);
      setShowPlayerSigningConfirmation(false);
    }
  };

  // Team Actions Section
  const renderTeamActions = () => {
    if (!isCaptain) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={processTeamRebrandPayment}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg p-4 flex flex-col items-center justify-center transition-all"
          disabled={processingPayment}
        >
          <Paintbrush className="mb-2" size={24} />
          <span className="font-medium">Rebrand Team</span>
          <span className="text-xs mt-1 text-blue-200">${itemPrices['TEAM_REBRAND']?.toFixed(2) || '0.00'}</span>
        </button>
        
        <button
          onClick={() => setShowTournamentRegistrationProcessor(true)}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg p-4 flex flex-col items-center justify-center transition-all"
          disabled={processingPayment}
        >
          <Trophy className="mb-2" size={24} />
          <span className="font-medium">Tournament Registration</span>
          <span className="text-xs mt-1 text-purple-200">${itemPrices['TOURNAMENT_REGISTRATION']?.toFixed(2) || '0.00'}</span>
        </button>
        
        <button
          onClick={() => setShowLeagueRegistrationProcessor(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg p-4 flex flex-col items-center justify-center transition-all"
          disabled={processingPayment}
        >
          <Users className="mb-2" size={24} />
          <span className="font-medium">League Registration</span>
          <span className="text-xs mt-1 text-green-200">${itemPrices['LEAGUE_REGISTRATION']?.toFixed(2) || '0.00'}</span>
        </button>
      </div>
    );
  };

  // Render online ID change processor when needed
  const renderOnlineIdProcessor = () => {
    if (!showOnlineIdProcessor || !selectedPlayerId) return null;
    
    const player = team?.members.find(member => member.user_id === selectedPlayerId);
    if (!player) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-base-200 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Change Online ID for {player.user?.username}</h2>
            
            <TeamActionProcessor
              actionType="online_id_change"
              teamId={team?.id || ''}
              userId={user?.id || ''}
              initialValue={player.user?.online_id || ''}
              onSuccess={handleOnlineIdSuccess}
              onCancel={handleOnlineIdCancel}
              onError={setError}
              requiresPayment={true}
              paymentAmount={itemPrices['ONLINE_ID_CHANGE'] || 5.00}
            />
          </div>
        </div>
      </div>
    );
  };

  // Handle success from league registration
  const handleLeagueRegistrationSuccess = (data: any) => {
    console.log('League registration initiated:', data);
    
    // Return early if team is null
    if (!team) {
      setError('Team data not found');
      setShowLeagueRegistrationProcessor(false);
      return;
    }
    
    const createAndProcessRequest = async () => {
      try {
        setProcessingPayment(true);
        
        // Get the price from the itemPrices state
        const price = itemPrices['LEAGUE_REGISTRATION'] || 50.00;
        
        // Generate a unique request ID
        const requestId = uuidv4();
        
        // Get the item_id from the database
        const itemId = itemIds['LEAGUE_REGISTRATION'] || '1004';
        console.log('Using item ID for league registration:', itemId);
        
        // Create team change request
        const result = await createTeamChangeRequest(
          'league_registration',
          team.id,
          user?.id || '',
          itemId,
          '', // Payment ID will be added after payment
          {
            leagueId: data.league_id,
            metadata: {
              league_id: data.league_id,
              leagueName: data.leagueName,
              season: data.season,
              team_id: team.id,
              team_name: team.name,
              playerIds: data.playerIds
            },
            requestId
          }
        );
        
        console.log('League registration request created:', result);
        setShowLeagueRegistrationProcessor(false);
      } catch (error) {
        console.error('Error creating league registration request:', error);
        setError('Failed to create league registration request');
      } finally {
        setProcessingPayment(false);
      }
    };
    
    createAndProcessRequest();
  };

  // Handle cancellation of league registration
  const handleLeagueRegistrationCancel = () => {
    setShowLeagueRegistrationProcessor(false);
  };

  // Handle success from tournament registration
  const handleTournamentRegistrationSuccess = (data: any) => {
    console.log('Tournament registration initiated:', data);
    
    // Return early if team is null
    if (!team) {
      setError('Team data not found');
      setShowTournamentRegistrationProcessor(false);
      return;
    }
    
    const createAndProcessRequest = async () => {
      try {
        setProcessingPayment(true);
        
        // Get the price from the itemPrices state
        const price = itemPrices['TOURNAMENT_REGISTRATION'] || 25.00;
        
        // Generate a unique request ID
        const requestId = uuidv4();
        
        // Get the item_id from the database
        const itemId = itemIds['TOURNAMENT_REGISTRATION'] || '1003';
        console.log('Using item ID for tournament registration:', itemId);
        
        // Create team change request
        const result = await createTeamChangeRequest(
          'tournament_registration',
          team.id,
          user?.id || '',
          itemId,
          '', // Payment ID will be added after payment
          {
            tournamentId: data.tournament_id,
            metadata: {
              tournament_id: data.tournament_id,
              tournamentName: data.tournamentName,
              team_id: team.id,
              team_name: team.name,
              playerIds: data.playerIds
            },
            requestId
          }
        );
        
        console.log('Tournament registration request created:', result);
        setShowTournamentRegistrationProcessor(false);
      } catch (error) {
        console.error('Error creating tournament registration request:', error);
        setError('Failed to create tournament registration request');
      } finally {
        setProcessingPayment(false);
      }
    };
    
    createAndProcessRequest();
  };

  // Handle cancellation of tournament registration
  const handleTournamentRegistrationCancel = () => {
    setShowTournamentRegistrationProcessor(false);
  };

  // Handle success from roster change
  const handleRosterChangeSuccess = (response: any) => {
    console.log('Roster change successful:', response);
    setShowRosterChangeProcessor(false);
    // Refresh team data to show the updated roster
    fetchTeamData();
  };

  // Handle cancellation of roster change
  const handleRosterChangeCancel = () => {
    setShowRosterChangeProcessor(false);
  };
  
  // Handle success from team transfer
  const handleTeamTransferSuccess = (response: any) => {
  // --- New Registration Flow Handlers ---


  // Handler for confirming rules and showing player selection
  const handleRulesConfirmed = () => {
    setIsRulesModalOpen(false);
    setIsPlayerSelectionVisible(true);
    // TODO: Add animation logic if desired
  };

  // Handler for canceling the rules modal
  const handleRulesCanceled = () => {
    setIsRulesModalOpen(false);
    setCurrentRegistrationType(null);
    setSelectedEventDetails(null);
  };

  // Handler for when player selection is complete
  const handleRosterComplete = (playerIds: string[]) => {
    if (playerIds.length !== 5) {
        setError("Please select exactly 5 players.");
        return; // Keep player selection open
    }
    setSelectedPlayerIds(playerIds);
    setIsPlayerSelectionVisible(false);
    setIsSummaryModalOpen(true);
  };

   // Handler for canceling the player selection form
  const handlePlayerSelectionCanceled = () => {
    setIsPlayerSelectionVisible(false);
    setCurrentRegistrationType(null);
    setSelectedEventDetails(null);
    setSelectedPlayerIds([]); // Clear selected players
  };

  // Handler for confirming the summary and proceeding to payment
  const handleSummaryConfirmed = async () => {
    setIsSummaryModalOpen(false); // Close summary modal immediately
    if (!team || !user || !selectedEventDetails || !currentRegistrationType) {
      setError("Missing required data to proceed with registration.");
      return;
    }

    const isTournament = currentRegistrationType === 'tournament';
    const requestType = isTournament ? 'tournament_registration' : 'league_registration';
    const eventId = selectedEventDetails.id;
    const eventName = selectedEventDetails.name;
    const priceKey = isTournament ? 'TOURNAMENT_REGISTRATION' : 'LEAGUE_REGISTRATION';
    const defaultPrice = isTournament ? 25.00 : 50.00;
    const defaultItemId = isTournament ? '1003' : '1004';

    try {
      setProcessingPayment(true); // Indicate processing START
      setError(null);

      const price = selectedEventDetails.registrationFee ?? itemPrices[priceKey] ?? defaultPrice;
      const itemId = itemIds[priceKey] || defaultItemId; // Use fetched item ID if available
      const requestId = uuidv4();

      console.log(`Starting ${requestType} process:`);
      console.log(`  Event ID: ${eventId}, Event Name: ${eventName}`);
      console.log(`  Team ID: ${team.id}, Captain ID: ${user.id}`);
      console.log(`  Selected Players: ${selectedPlayerIds.join(', ')}`);
      console.log(`  Price: ${price}, Item ID: ${itemId}, Request ID: ${requestId}`);

      // 1. Create Payment Details
      const paymentDetails = createPaymentDetails(
        currentRegistrationType, // 'league' or 'tournament'
        `${isTournament ? 'Tournament' : 'League'} Registration for ${eventName}`, // More specific description
        price,
        `Team: ${team.name}, Event: ${eventName}`, // Note for payment processor
        { // Data for payment processor metadata & potentially request creation
          teamId: team.id,
          captainId: user.id, // Keep captainId if needed by payment processor/backend
          eventId: eventId,
          item_id: itemId, // Use the specific item ID
          playersIds: selectedPlayerIds, // Pass selected players
          request_id: requestId // Crucial for linking payment and request
        }
      );

      // Add metadata specifically structured for the team_change_requests table
      // This aligns with dev_notes.md structure
      paymentDetails.metadata = {
        ...paymentDetails.metadata, // Keep existing payment metadata
        requestType: requestType, // For backend routing/identification
        eventName: eventName,
        teamName: team.name,
        playerIds: selectedPlayerIds, // Ensure player IDs are here
        // Nested data specifically for the change request record itself
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          [isTournament ? 'tournamentId' : 'leagueId']: eventId, // Correctly set event ID field
          oldValue: '', // Not applicable for registration
          newValue: eventId, // Store event ID as new value? Or maybe roster? TBD by backend needs.
          requestId: requestId, // Link back to the request
          metadata: { // Metadata specific to the request record
            eventName: eventName,
            teamName: team.name,
            playerIds: selectedPlayerIds,
            requestId: requestId // Redundant but ensures it's present
          }
        }
      };

      console.log("Payment Details:", JSON.stringify(paymentDetails, null, 2));

      // 2. Navigate to Payment Page
       navigate('/payments', {
         state: {
           paymentDetails,
           // Tell payment page what kind of request to create on success
           changeRequestType: requestType,
           // Pass options needed by createTeamChangeRequest on the payment success callback
           changeRequestOptions: {
             [isTournament ? 'tournamentId' : 'leagueId']: eventId,
             metadata: paymentDetails.metadata.changeRequestData.metadata, // Pass nested metadata
             requestId: requestId, // Pass the generated request ID
             // playerIds are in metadata, no need to pass separately unless createTeamChangeRequest needs them directly
           }
         }
       });

      // Reset state *after* successful navigation initiation
      // Note: Actual processing state should be handled based on payment page result
      // setProcessingPayment(false); // Move this logic
      setCurrentRegistrationType(null);
      setSelectedEventDetails(null);
      setSelectedPlayerIds([]);

    } catch (err: any) {
      console.error(`Error during ${requestType} confirmation:`, err);
      setError(`Failed to initiate registration: ${err.message}`);
      setProcessingPayment(false); // Ensure processing stops on error
    }
  };

   // Handler for canceling the summary modal
  const handleSummaryCanceled = () => {
    setIsSummaryModalOpen(false);
    // Reset state to allow restarting the flow cleanly
    setCurrentRegistrationType(null);
    setSelectedEventDetails(null);
    setSelectedPlayerIds([]);
    setIsPlayerSelectionVisible(false); // Hide player selection too
  };

  // --- End New Registration Flow Handlers ---

    console.log('Team transfer successful:', response);
    setShowTeamTransferProcessor(false);
    // Usually will navigate away since user is no longer captain
    navigate('/dashboard');
  };

  // Handle cancellation of team transfer
  const handleTeamTransferCancel = () => {
    setShowTeamTransferProcessor(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-800 text-white p-4 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <div className="bg-blue-800 text-white p-6 rounded-lg shadow-lg mb-4 max-w-lg w-full">
          <h3 className="text-xl font-bold mb-4">No Team Found</h3>
          <p className="mb-4">This team was not found. You may need to create a team or navigate to a valid team page.</p>
          <button 
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600"
            onClick={() => navigate('/create-team')}
          >
            Create a Team
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {team.name}
              {isCaptain && (
                <button
                  onClick={handleEditTeamName}
                  className="ml-2 text-gray-400 hover:text-white"
                  title="Edit Team Name"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </h1>
            <p className="text-gray-400">Team ID: {team.id}</p>
          </div>
        </div>

        {/* Non-captain view */}
        {!isCaptain && (
          <div>
            <p className="text-white mb-4">Welcome to the {team.name} page.</p>
            
            {/* Show rosters user is part of */}
            {userOnRoster ? (
              <div>
                {leagueRosters.length > 0 && (
                  <div className="bg-gray-700 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">League Rosters</h2>
                    <div className="overflow-x-auto">
                      {/* League roster display */}
                      <table className="min-w-full bg-gray-800 text-white">
                        <thead>
                          <tr className="bg-gray-900">
                            <th className="py-2 px-4 text-left">League</th>
                            <th className="py-2 px-4 text-left">Status</th>
                            <th className="py-2 px-4 text-left">Players</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leagueRosters.map((roster: any) => (
                            <tr key={roster.id} className="border-t border-gray-700">
                              <td className="py-2 px-4">{roster.league_name}</td>
                              <td className="py-2 px-4">{roster.status}</td>
                              <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {tournamentRosters.length > 0 && (
                  <div className="bg-gray-700 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Tournament Rosters</h2>
                    <div className="overflow-x-auto">
                      {/* Tournament roster display */}
                      <table className="min-w-full bg-gray-800 text-white">
                        <thead>
                          <tr className="bg-gray-900">
                            <th className="py-2 px-4 text-left">Tournament</th>
                            <th className="py-2 px-4 text-left">Status</th>
                            <th className="py-2 px-4 text-left">Players</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tournamentRosters.map((roster: any) => (
                            <tr key={roster.id} className="border-t border-gray-700">
                              <td className="py-2 px-4">{roster.tournament_name}</td>
                              <td className="py-2 px-4">{roster.status}</td>
                              <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white">
                You are not currently on a League or Tournament roster. 
                Registered rosters you are a part of will appear here.
              </p>
            )}
          </div>
        )}

        {/* Captain view - entire dashboard */}
        {isCaptain && (
          <div>
            {/* Front Office Section */}
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Front Office</h2>
              <p className="text-gray-300 mb-4">Manage your team's registration, branding, and roster changes.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Team Actions */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Team Management</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={handleEditTeamName}
                      className="w-full text-left px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center"
                    >
                      <Paintbrush className="w-4 h-4 mr-2" />
                      <span>Rebrand Team (${itemPrices['TEAM_REBRAND'] || 10.00})</span>
                    </button>
                  </div>
                </div>

                {/* Registration Actions */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Registration</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleStartLeagueRegistration()} // Explicit event type
                      className="w-full text-left px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      <span>League Registration (${itemPrices['LEAGUE_REGISTRATION'] || 50.00})</span>
                    </button>
                    <button 
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleStartTournamentRegistration()} // Explicit event type
                      className="w-full text-left px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      <span>Tournament Registration (${itemPrices['TOURNAMENT_REGISTRATION'] || 25.00})</span>
                    </button>
                  </div>
                </div>

                {/* Roster Actions */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Roster Management</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowRosterChangeProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded flex items-center"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      <span>Roster Change (${itemPrices['ROSTER_CHANGE'] || 5.00})</span>
                    </button>
                    <button 
                      onClick={() => setShowOnlineIdProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <span>Online ID Change (${itemPrices['ONLINE_ID_CHANGE'] || 5.00})</span>
                    </button>
                  </div>
                </div>

                {/* Team Transfer */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Ownership</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowTeamTransferProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center"
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      <span>Transfer Team (${itemPrices['TEAM_TRANSFER'] || 15.00})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TeamActionProcessor integration - will be shown when an action is selected */}
              {showTeamRebrandProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="team_rebrand"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue={team.name}
                    onSuccess={handleRebrandSuccess}
                    onCancel={handleRebrandCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['TEAM_REBRAND'] || 20.00}
                  />
                </div>
              )}

              {/* League Registration Processor */}
              {showLeagueRegistrationProcessor && (
                <div className="mt-6 rounded-lg overflow-hidden">
                  <TeamActionProcessor
                    actionType="league_registration"
                    teamId={team.id}
                    userId={user?.id || ''}
                    onSuccess={handleLeagueRegistrationSuccess}
                    onCancel={handleLeagueRegistrationCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['LEAGUE_REGISTRATION'] || 50.00}
                  />
                </div>
              )}

              {/* Tournament Registration Processor */}
              {showTournamentRegistrationProcessor && (
                <div className="mt-6 rounded-lg overflow-hidden">
                  <TeamActionProcessor
                    actionType="tournament_registration"
                    teamId={team.id}
                    userId={user?.id || ''}
                    onSuccess={handleTournamentRegistrationSuccess}
                    onCancel={handleTournamentRegistrationCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['TOURNAMENT_REGISTRATION'] || 25.00}
                  />
                </div>
              )}

              {showRosterChangeProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="roster_change"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue=""
                    onSuccess={handleRosterChangeSuccess}
                    onCancel={handleRosterChangeCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['ROSTER_CHANGE'] || 5.00}
                    members={team.members}
                  />
                </div>
              )}

              {showTeamTransferProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="team_transfer"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue=""
                    onSuccess={handleTeamTransferSuccess}
                    onCancel={handleTeamTransferCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['TEAM_TRANSFER'] || 15.00}
                    members={team.members}
                  />
                </div>
              )}
            </div>

            {/* League Rosters Section */}
            {leagueRosters.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold text-white mb-4">League Rosters</h2>
                {/* League roster display */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-800 text-white">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="py-2 px-4 text-left">League</th>
                        <th className="py-2 px-4 text-left">Status</th>
                        <th className="py-2 px-4 text-left">Players</th>
                        <th className="py-2 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagueRosters.map((roster: any) => (
                        <tr key={roster.id} className="border-t border-gray-700">
                          <td className="py-2 px-4">{roster.league_name}</td>
                          <td className="py-2 px-4">{roster.status}</td>
                          <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                          <td className="py-2 px-4">
                            <button
                              onClick={() => alert('Manage League Roster')}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tournament Rosters Section */}
            {tournamentRosters.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Tournament Rosters</h2>
                {/* Tournament roster display */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-800 text-white">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="py-2 px-4 text-left">Tournament</th>
                        <th className="py-2 px-4 text-left">Status</th>
                        <th className="py-2 px-4 text-left">Players</th>
                        <th className="py-2 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentRosters.map((roster: any) => (
                        <tr key={roster.id} className="border-t border-gray-700">
                          <td className="py-2 px-4">{roster.tournament_name}</td>
                          <td className="py-2 px-4">{roster.status}</td>
                          <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                          <td className="py-2 px-4">
                            <button
                              onClick={() => alert('Manage Tournament Roster')}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Free Agency Section */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Free Agency</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800 text-white">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="py-2 px-4 text-left">Player</th>
                      <th className="py-2 px-4 text-left">Role</th>
                      <th className="py-2 px-4 text-left">Online ID</th>
                      <th className="py-2 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.members.map((member) => (
                      <tr key={member.user_id} className="border-t border-gray-700">
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            {member.user?.avatar_url && (
                              <img 
                                src={member.user.avatar_url} 
                                alt={member.user.username || 'Player'} 
                                className="w-8 h-8 rounded-full mr-2"
                              />
                            )}
                            <div>
                              <div className="font-medium">{member.user?.username || 'Unknown Player'}</div>
                              <div className="text-gray-400 text-sm">{member.user?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-4">{member.role}</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            <span>{member.user?.online_id || 'Not set'}</span>
                            <button
                              onClick={() => handleEditOnlineId(member.user_id)}
                              className="ml-2 text-gray-400 hover:text-white"
                              title="Edit Online ID"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          {member.user_id !== team.captain_id && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleRemovePlayer(member.user_id)}
                                className="text-red-500 hover:text-red-400"
                                title="Remove Player"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleTransferOwnership(member.user_id, member.user?.username || 'Player')}
                                className="text-yellow-500 hover:text-yellow-400"
                                title="Transfer Ownership"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {member.user_id === team.captain_id && (
                            <span className="text-green-500 text-sm">Captain</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={handleAddPlayer}
                  className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600 text-sm flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Add Player
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Render online ID processor as a modal */}
      {renderOnlineIdProcessor()}

      {/* Show confirmation dialogs */}
      <ConfirmationDialog
        isOpen={showOnlineIdConfirmation}
        title="Confirm Online ID Change"
        message={`Are you sure you want to change the online ID to "${newOnlineId}"? This may require a payment.`}
        confirmText="Continue to Payment"
        cancelText="Cancel"
        onConfirm={processOnlineIdChangePayment}
        onCancel={() => setShowOnlineIdConfirmation(false)}
        type="warning"
      />

      {/* --- New Registration Flow Components --- */}

      {/* Step 1: Show Rules Modal */}
      <EventRulesModal
        isOpen={isRulesModalOpen}
        eventType={currentRegistrationType || 'tournament'} // Default needed, but should be set
        eventDetails={selectedEventDetails}
        onConfirm={handleRulesConfirmed}
        onCancel={handleRulesCanceled}
      />

      {/* Step 2: Show Player Selection Form (Rendered inline or as a modal overlay) */}
      {/* Option A: Render inline within the dashboard structure */}
      {isPlayerSelectionVisible && currentRegistrationType && selectedEventDetails && team && (
        <div className="mt-6 bg-gray-700 p-4 rounded-lg mb-6">
           <PlayerSelectionForm
            eventType={currentRegistrationType}
            eventDetails={selectedEventDetails}
            teamId={team.id}
            onRosterComplete={handleRosterComplete}
            onCancel={handlePlayerSelectionCanceled}
          />
        </div>
      )}
      {/* Option B: Render as a modal overlay (uncomment if preferred)
      <Modal isOpen={isPlayerSelectionVisible} onClose={handlePlayerSelectionCanceled} title={`Select Roster for ${selectedEventDetails?.name}`} size="xl">
         {currentRegistrationType && selectedEventDetails && team && (
           <PlayerSelectionForm
             eventType={currentRegistrationType}
             eventDetails={selectedEventDetails}
             teamId={team.id}
             onRosterComplete={handleRosterComplete}
             onCancel={handlePlayerSelectionCanceled}
           />
         )}
      </Modal>
      */}


      {/* Step 3: Show Summary Modal */}
      <RegistrationSummaryModal
        isOpen={isSummaryModalOpen}
        eventType={currentRegistrationType || 'tournament'} // Default needed
        eventDetails={selectedEventDetails}
        // Pass the fetched full player details
        // Ensure the structure matches what RegistrationSummaryModal expects (e.g., { id: string, username?: string })
        selectedPlayers={selectedPlayerDetails}
        onConfirm={handleSummaryConfirmed}
        onCancel={handleSummaryCanceled}
      />

      {/* --- End New Registration Flow Components --- */}


      <ConfirmationDialog
        isOpen={showRebrandConfirmation}
        title="Confirm Team Name Change"
        message={`Are you sure you want to rename the team from "${team?.name}" to "${newTeamName}"? This requires a payment.`}
        confirmText="Continue to Payment"
        cancelText="Cancel"
        onConfirm={processTeamRebrandPayment}
        onCancel={() => setShowRebrandConfirmation(false)}
        type="warning"
      />

      <ConfirmationDialog
        isOpen={showPlayerSigningConfirmation}
        title="Confirm Player Signing Request"
        message={`Are you sure you want to request signing ${playerName} (${playerEmail}) to your team? This requires a payment.`}
        confirmText="Continue to Payment"
        cancelText="Cancel"
        onConfirm={processPlayerSigningPayment}
        onCancel={() => setShowPlayerSigningConfirmation(false)}
        type="warning"
      />
    </div>
  );
};

export default TeamDashboard;