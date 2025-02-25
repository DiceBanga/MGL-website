import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trophy, Calendar, Settings, Plus, Trash2, User2, Globe, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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
  banner_url: string | null;
  website: string | null;
  email: string | null;
  captain_id: string;
}

const TeamDashboard = () => {
  const { teamId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Team>>({});
  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchTeamData();
  }, [user, teamId, navigate]);

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
        players!inner (
          display_name
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
      jersey_number: member.jersey_number
    })));
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

            {/* Team Members Section */}
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Team Members</h2>
                <button className="text-green-500 hover:text-green-400">
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-gray-700/50 p-4 rounded-lg"
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
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
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
    </div>
  );
};

export default TeamDashboard;