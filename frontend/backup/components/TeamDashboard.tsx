import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Loading from './Loading';
import TeamActionProcessor from './TeamActionProcessor';
import LeagueRoster from './LeagueRoster';
import TournamentRoster from './TournamentRoster';
import FreeAgencySection from './FreeAgencySection';
import { User, Team, Member } from '../types';

// Define price constants for team actions
const ITEM_PRICES = {
  TEAM_REBRAND: 10.00,
  LEAGUE_REGISTRATION: 50.00,
  TOURNAMENT_REGISTRATION: 25.00,
  ROSTER_CHANGE: 5.00,
  ONLINE_ID_CHANGE: 5.00,
  TEAM_TRANSFER: 15.00
};

const ITEM_IDS = {
  TEAM_REBRAND: 'team_rebrand',
  LEAGUE_REGISTRATION: 'league_registration',
  TOURNAMENT_REGISTRATION: 'tournament_registration',
  ROSTER_CHANGE: 'roster_change',
  ONLINE_ID_CHANGE: 'online_id_change',
  TEAM_TRANSFER: 'team_transfer'
};

function TeamDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [leagueRosters, setLeagueRosters] = useState([]);
  const [tournamentRosters, setTournamentRosters] = useState([]);
  const [isCaptain, setIsCaptain] = useState(false);
  const [userOnRoster, setUserOnRoster] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchTeamData();
  }, [id, user]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // Fetch team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          joined_at,
          players (id, username, full_name, avatar_url)
        `)
        .eq('team_id', id);

      if (membersError) throw membersError;
      setMembers(membersData);

      // Check if current user is team captain
      if (user && teamData) {
        setIsCaptain(user.id === teamData.captain_id);
      }

      // Fetch league rosters
      const { data: leagueData, error: leagueError } = await supabase
        .from('league_rosters')
        .select('*')
        .eq('team_id', id);

      if (leagueError) throw leagueError;
      setLeagueRosters(leagueData);

      // Fetch tournament rosters
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournament_rosters')
        .select('*')
        .eq('team_id', id);

      if (tournamentError) throw tournamentError;
      setTournamentRosters(tournamentData);

      // Check if user is on any roster
      const userOnAnyRoster = 
        leagueData.some(roster => roster.players.includes(user?.id)) || 
        tournamentData.some(roster => roster.players.includes(user?.id));
      
      setUserOnRoster(userOnAnyRoster);

    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!team) return <div className="text-center">Team not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">{team.name}</h1>

      {/* Non-captain view */}
      {!isCaptain && (
        <div>
          <p className="mb-4">Welcome to the {team.name} page.</p>
          
          {/* Show rosters user is part of */}
          {userOnRoster ? (
            <div>
              {leagueRosters.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">League Rosters</h2>
                  {leagueRosters.map(roster => (
                    <LeagueRoster key={roster.id} roster={roster} />
                  ))}
                </div>
              )}
              
              {tournamentRosters.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Tournament Rosters</h2>
                  {tournamentRosters.map(roster => (
                    <TournamentRoster key={roster.id} roster={roster} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p>
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
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Front Office</h2>
            <p className="mb-4">Manage your team's registration, branding, and roster changes.</p>

            {/* TeamActionProcessor integration */}
            <TeamActionProcessor
              team={team}
              user={user}
              members={members}
              itemPrices={ITEM_PRICES}
              itemIds={ITEM_IDS}
              onSuccess={(result) => {
                setSuccessMessage(`Action completed successfully!`);
                fetchTeamData(); // Reload team data to reflect changes
              }}
              onError={(error) => {
                setError(error);
              }}
            />
          </div>

          {/* League Rosters Section */}
          {leagueRosters.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">League Rosters</h2>
              {leagueRosters.map(roster => (
                <LeagueRoster key={roster.id} roster={roster} isEditable={true} />
              ))}
            </div>
          )}

          {/* Tournament Rosters Section */}
          {tournamentRosters.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Tournament Rosters</h2>
              {tournamentRosters.map(roster => (
                <TournamentRoster key={roster.id} roster={roster} isEditable={true} />
              ))}
            </div>
          )}

          {/* Free Agency Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Free Agency</h2>
            <FreeAgencySection 
              team={team} 
              members={members} 
              onUpdate={fetchTeamData} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamDashboard; 