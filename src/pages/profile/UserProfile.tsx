import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User2, Trophy, GamepadIcon, BarChart2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  display_name: string;
  team_name: string | null;
  games_played: number;
  win_rate: number;
  avg_score: number;
}

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('players')
      .select(`
        display_name,
        team_players!inner(
          teams!inner(
            name
          )
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      return;
    }

    // For demo purposes, using static stats
    // In production, these would come from the database
    setProfile({
      display_name: data.display_name,
      team_name: data.team_players[0]?.teams.name || null,
      games_played: 32,
      win_rate: 68,
      avg_score: 86.5
    });
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
                <div className="bg-green-500/10 p-4 rounded-full">
                  <User2 className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{profile.display_name}</h2>
                  {profile.team_name && (
                    <p className="text-gray-400">
                      Team: {profile.team_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <GamepadIcon className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Games Played</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{profile.games_played}</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Trophy className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{profile.win_rate}%</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <BarChart2 className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Avg Score</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{profile.avg_score}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-white">Won Tournament Match</p>
                        <p className="text-sm text-gray-400">vs LA Knights</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">2h ago</span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-white">Joined Team</p>
                        <p className="text-sm text-gray-400">{profile.team_name}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">2d ago</span>
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