import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Trophy, Calendar, BarChart2, User2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TeamMember {
  id: string;
  display_name: string;
  role: string;
  jersey_number: number | null;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  wins: number;
  losses: number;
  tournaments_played: number;
}

const TeamProfile = () => {
  const { teamId } = useParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamData();
  }, [teamId]);

  const fetchTeamData = async () => {
    if (!teamId) return;

    // Fetch team data
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        standings (
          wins,
          losses
        )
      `)
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      setLoading(false);
      return;
    }

    // For demo purposes, using static stats
    // In production, these would come from the database
    setTeam({
      ...teamData,
      wins: teamData.standings?.[0]?.wins || 28,
      losses: teamData.standings?.[0]?.losses || 4,
      tournaments_played: 5
    });

    // Fetch team members
    const { data: membersData, error: membersError } = await supabase
      .from('team_players')
      .select(`
        user_id,
        role,
        jersey_number,
        players!inner (
          display_name
        )
      `)
      .eq('team_id', teamId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      setLoading(false);
      return;
    }

    setMembers(membersData.map(member => ({
      id: member.user_id,
      display_name: member.players.display_name,
      role: member.role,
      jersey_number: member.jersey_number
    })));

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Team Not Found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Overview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="bg-green-500/10 p-4 rounded-full">
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                  {team.website && (
                    <a
                      href={team.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-400"
                    >
                      {team.website}
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Trophy className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Record</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {team.wins}W - {team.losses}L
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Tournaments</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{team.tournaments_played}</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <BarChart2 className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {((team.wins / (team.wins + team.losses)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Team Schedule */}
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Upcoming Games</h2>
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white">vs LA Knights</p>
                      <p className="text-sm text-gray-400">Season 6 Championship Series</p>
                    </div>
                    <p className="text-green-500">Tomorrow, 7:00 PM ET</p>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white">vs CHI Winds</p>
                      <p className="text-sm text-gray-400">Season 6 Championship Series</p>
                    </div>
                    <p className="text-green-500">Mar 5, 9:30 PM ET</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Roster */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Team Roster</h2>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-700/50 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-500/10 p-2 rounded-full">
                        <User2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-white">{member.display_name}</p>
                        <p className="text-sm text-gray-400">
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          {member.jersey_number && ` • #${member.jersey_number}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamProfile;