import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User2, Settings, Trophy, GamepadIcon, BarChart2, Users, Twitter, Twitch, Youtube, Instagram, Disc as Discord, Mail, Phone, Globe, Clock, Plus, Camera, X, Search, Home } from 'lucide-react';
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

interface AvailableTeam {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  member_count: number;
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
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTeamBrowser, setShowTeamBrowser] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<AvailableTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isJoining, setIsJoining] = useState<string | null>(null);

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

  const fetchAvailableTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        logo_url,
        description,
        team_players (count)
      `)
      .ilike('name', `%${searchQuery}%`)
      .not('team_players.user_id', 'eq', user?.id);

    if (error) {
      console.error('Error fetching available teams:', error);
      return;
    }

    setAvailableTeams(data.map(team => ({
      id: team.id,
      name: team.name,
      logo_url: team.logo_url,
      description: team.description,
      member_count: team.team_players[0].count
    })));
  };

  useEffect(() => {
    if (showTeamBrowser) {
      fetchAvailableTeams();
    }
  }, [showTeamBrowser, searchQuery]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('players')
        .update({
          avatar_url: publicUrl,
          avatar_upload_path: filePath
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name,
          description: newTeam.description,
          captain_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add captain as team member
      await supabase
        .from('team_players')
        .insert({
          team_id: data.id,
          user_id: user.id,
          role: 'captain'
        });

      // Refresh teams
      fetchUserTeams();
      setIsCreatingTeam(false);
      setNewTeam({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!user) return;
    setIsJoining(teamId);

    try {
      const { error } = await supabase
        .from('team_players')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'player'
        });

      if (error) throw error;

      // Refresh teams list
      fetchUserTeams();
      setShowTeamBrowser(false);
    } catch (error) {
      console.error('Error joining team:', error);
    } finally {
      setIsJoining(null);
    }
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

  const TeamBrowser = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Browse Teams</h3>
          <button
            onClick={() => setShowTeamBrowser(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="space-y-4">
          {availableTeams.map((team) => (
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
                  <h4 className="text-white font-medium">{team.name}</h4>
                  <p className="text-sm text-gray-400">
                    {team.description || 'No description available'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {team.member_count} members
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleJoinTeam(team.id)}
                disabled={isJoining === team.id}
                className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining === team.id ? 'Joining...' : 'Join Team'}
              </button>
            </div>
          ))}
          {availableTeams.length === 0 && (
            <p className="text-center text-gray-400">No teams found</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div 
                    className="relative w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center cursor-pointer group"
                    onClick={handleAvatarClick}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <User2 className="w-12 h-12 text-green-500" />
                    )}
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-white">{profile?.display_name}</h2>
                    <p className="text-gray-400">{profile?.bio || 'No bio set'}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
                      <Home className="w-5 h-5 mr-2" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-green-500 hover:text-green-400"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">My Teams</h2>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowTeamBrowser(true)}
                    className="flex items-center space-x-2 text-green-500 hover:text-green-400"
                  >
                    <Users className="w-5 h-5" />
                    <span>Join Team</span>
                  </button>
                  <button
                    onClick={() => setIsCreatingTeam(true)}
                    className="flex items-center space-x-2 text-green-500 hover:text-green-400"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Team</span>
                  </button>
                </div>
              </div>

              {isCreatingTeam ? (
                <form onSubmit={handleCreateTeam} className="bg-gray-700/50 rounded-lg p-4 mb-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        className="w-full rounded-md border-gray-700 bg-gray-600 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newTeam.description}
                        onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                        className="w-full rounded-md border-gray-700 bg-gray-600 text-white"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsCreatingTeam(false)}
                        className="px-4 py-2 text-gray-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
                      >
                        Create Team
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}

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
                    <button 
                      onClick={() => navigate(`/team/${team.id}/dashboard`)}
                      className="text-green-500 hover:text-green-400"
                    >
                      Manage →
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

      {showTeamBrowser && <TeamBrowser />}
    </div>
  );
};

export default UserDashboard;