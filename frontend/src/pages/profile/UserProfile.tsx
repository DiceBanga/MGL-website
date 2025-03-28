import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User2, Trophy, GamepadIcon, BarChart2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DbPlayer, DbTeamMember } from '../../types/database';

// Extended interface for UI-specific properties
interface UserProfileUI extends DbPlayer {
  bio: string | null;
  twitter_handle: string | null;
}

// Extended interface for team data with team information
interface TeamWithTeamData {
  team_id: string;
  role: string;
  teams: {
    name: string;
    logo_url: string | null;
  };
}

// UI-specific interface for team data
interface TeamUI {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
}

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<UserProfileUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamUI[]>([]);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      // Fetch basic profile info
      const { data: profileData, error: profileError } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Transform to UserProfileUI
      setProfile({
        user_id: profileData.user_id,
        display_name: profileData.display_name,
        email: profileData.email,
        role: profileData.role,
        avatar_url: profileData.avatar_url,
        online_id: profileData.online_id,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
        bio: profileData.bio,
        twitter_handle: profileData.twitter_handle
      });

      // Fetch teams separately
      const { data: teamData, error: teamError } = await supabase
        .from('team_players')
        .select(`
          team_id,
          role,
          teams (
            name,
            logo_url
          )
        `)
        .eq('user_id', userId);

      if (teamError) throw teamError;

      // Transform the data to match the TeamUI interface
      setTeams(((teamData || []) as unknown as TeamWithTeamData[]).map(team => ({
        id: team.team_id,
        name: team.teams.name,
        logo_url: team.teams.logo_url,
        role: team.role
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
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

  if (!profile) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Profile Not Found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User2 className="w-12 h-12 text-green-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{profile.display_name}</h2>
                  {profile.bio && (
                    <p className="text-gray-300 mt-1">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* Teams */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Teams</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="bg-gray-700/50 rounded-lg p-4 flex items-center space-x-4"
                    >
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{team.name}</p>
                        <p className="text-sm text-gray-400">{team.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <GamepadIcon className="w-5 h-5 text-green-500" />
                      <span className="text-gray-300">Games Played</span>
                    </div>
                    <span className="text-white font-semibold">32</span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-5 h-5 text-green-500" />
                      <span className="text-gray-300">Win Rate</span>
                    </div>
                    <span className="text-white font-semibold">68%</span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BarChart2 className="w-5 h-5 text-green-500" />
                      <span className="text-gray-300">Average Score</span>
                    </div>
                    <span className="text-white font-semibold">86.5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;