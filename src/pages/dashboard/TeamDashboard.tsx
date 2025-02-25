import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trophy, Calendar, Settings, Plus, Trash2, User2, Globe, Mail, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface TeamMember {
  id: string;
  display_name: string;
  role: string;
  jersey_number: number | null;
  can_be_deleted: boolean;
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

interface DeleteConfirmation {
  type: 'disband' | 'transfer';
  show: boolean;
  targetId?: string;
  step: 1 | 2;
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
        can_be_deleted,
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
      jersey_number: member.jersey_number,
      can_be_deleted: member.can_be_deleted
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
  );
};

export default TeamDashboard;