import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User2, Settings, Trophy, GamepadIcon, BarChart2, Users, Twitter, Twitch, Youtube, Instagram, Disc as Discord, Mail, Phone, Globe, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  display_name: string;
  email: string;
  phone: string | null;
  timezone: string | null;
  language: string;
  avatar_url: string | null;
  bio: string | null;
  twitter_handle: string | null;
  twitch_handle: string | null;
  youtube_handle: string | null;
  instagram_handle: string | null;
  discord_handle: string | null;
}

interface UserStats {
  games_played: number;
  win_rate: number;
  avg_score: number;
  tournaments_won: number;
  total_points: number;
  mvp_count: number;
}

interface UserTeam {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
}

const UserDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    games_played: 32,
    win_rate: 68,
    avg_score: 86.5,
    tournaments_won: 3,
    total_points: 1240,
    mvp_count: 5
  });
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchUserProfile();
    fetchUserTeams();
  }, [user, navigate]);

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    setProfile(data);
    setFormData(data);
  };

  const fetchUserTeams = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('team_players')
      .select(`
        teams (
          id,
          name,
          logo_url
        ),
        role
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching teams:', error);
      return;
    }

    setTeams(data.map(item => ({
      id: item.teams.id,
      name: item.teams.name,
      logo_url: item.teams.logo_url,
      role: item.role
    })));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('players')
      .update(formData)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error updating profile:', error);
      return;
    }

    setProfile(formData as UserProfile);
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-900/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        className="w-20 h-20 rounded-full"
                      />
                    ) : (
                      <User2 className="w-12 h-12 text-green-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{profile?.display_name}</h2>
                    <p className="text-gray-400">{profile?.bio || 'No bio set'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-green-500 hover:text-green-400"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Display Name
                    </label>
                    <input
                      type="text"
                      name="display_name"
                      value={formData.display_name || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Twitter Handle
                      </label>
                      <input
                        type="text"
                        name="twitter_handle"
                        value={formData.twitter_handle || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Twitch Handle
                      </label>
                      <input
                        type="text"
                        name="twitch_handle"
                        value={formData.twitch_handle || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        YouTube Handle
                      </label>
                      <input
                        type="text"
                        name="youtube_handle"
                        value={formData.youtube_handle || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Instagram Handle
                      </label>
                      <input
                        type="text"
                        name="instagram_handle"
                        value={formData.instagram_handle || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-green-500" />
                      <span className="text-gray-300">{profile?.email}</span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-green-500" />
                        <span className="text-gray-300">{profile.phone}</span>
                      </div>
                    )}
                    {profile?.timezone && (
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-green-500" />
                        <span className="text-gray-300">{profile.timezone}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {profile?.twitter_handle && (
                      <a
                        href={`https://twitter.com/${profile.twitter_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-gray-300 hover:text-green-400"
                      >
                        <Twitter className="w-5 h-5" />
                        <span>@{profile.twitter_handle}</span>
                      </a>
                    )}
                    {profile?.twitch_handle && (
                      <a
                        href={`https://twitch.tv/${profile.twitch_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-gray-300 hover:text-green-400"
                      >
                        <Twitch className="w-5 h-5" />
                        <span>{profile.twitch_handle}</span>
                      </a>
                    )}
                    {profile?.youtube_handle && (
                      <a
                        href={`https://youtube.com/@${profile.youtube_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-gray-300 hover:text-green-400"
                      >
                        <Youtube className="w-5 h-5" />
                        <span>{profile.youtube_handle}</span>
                      </a>
                    )}
                    {profile?.instagram_handle && (
                      <a
                        href={`https://instagram.com/${profile.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-gray-300 hover:text-green-400"
                      >
                        <Instagram className="w-5 h-5" />
                        <span>@{profile.instagram_handle}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Teams Section */}
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">My Teams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-green-500" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-medium">{team.name}</h3>
                        <p className="text-sm text-gray-400">{team.role}</p>
                      </div>
                    </div>
                    <button className="text-green-500 hover:text-green-400">
                      View Team →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <GamepadIcon className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold text-white">{stats.games_played}</span>
                  </div>
                  <p className="text-sm text-gray-400">Games Played</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold text-white">{stats.win_rate}%</span>
                  </div>
                  <p className="text-sm text-gray-400">Win Rate</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart2 className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold text-white">{stats.avg_score}</span>
                  </div>
                  <p className="text-sm text-gray-400">Avg Score</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold text-white">{stats.tournaments_won}</span>
                  </div>
                  <p className="text-sm text-gray-400">Tournaments Won</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
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
                        <p className="text-sm text-gray-400">NYC Dragons</p>
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

export default UserDashboard;