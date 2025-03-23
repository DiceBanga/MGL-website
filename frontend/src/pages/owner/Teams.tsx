import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Search, Filter, Users, AlertTriangle, X, Check, Home, User2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

interface Team {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  captain_id: string;
  captain_name: string;
  member_count: number;
  status: string;
  created_at: string;
}

function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>('');
  const [changingCaptain, setChangingCaptain] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchTeams();
  }, [statusFilter, sortField, sortDirection]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      // Get teams with captain info and member count
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          players:captain_id (
            display_name
          ),
          team_players (
            count
          )
        `);

      if (error) throw error;

      // Format the data
      const formattedTeams = data.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        logo_url: team.logo_url,
        captain_id: team.captain_id,
        captain_name: team.players?.display_name || 'Unknown',
        member_count: team.team_players[0]?.count || 0,
        status: team.status || 'active',
        created_at: team.created_at
      }));

      // Apply filters
      let filteredTeams = formattedTeams;
      
      if (statusFilter !== 'all') {
        filteredTeams = filteredTeams.filter(team => team.status === statusFilter);
      }

      // Sort teams
      filteredTeams.sort((a, b) => {
        const fieldA = a[sortField as keyof Team] || '';
        const fieldB = b[sortField as keyof Team] || '';
        
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          return sortDirection === 'asc' 
            ? fieldA.localeCompare(fieldB)
            : fieldB.localeCompare(fieldA);
        }
        
        return 0;
      });

      setTeams(filteredTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter teams based on search term
    const filtered = teams.filter(team => 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      team.captain_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setTeams(filtered);
    
    // If search term is empty, fetch all teams again
    if (!searchTerm) {
      fetchTeams();
    }
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as any);
      setSortDirection('asc');
    }
  };

  const handleEditClick = (team: Team) => {
    setCurrentTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      status: team.status
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (team: Team) => {
    setCurrentTeam(team);
    setShowDeleteModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          description: formData.description,
          status: formData.status
        })
        .eq('id', currentTeam.id);

      if (error) throw error;

      // Refresh team list
      fetchTeams();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentTeam) return;

    try {
      console.log('Deleting team with ID:', currentTeam.id);
      
      // Use the delete_team RPC function instead of directly deleting
      const { error } = await supabase.rpc('delete_team', {
        p_team_id: currentTeam.id
      });

      if (error) {
        console.error('Error calling delete_team function:', error);
        throw error;
      }

      console.log('Team deleted successfully');
      // Refresh team list
      fetchTeams();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const handleCaptainClick = async (team: Team) => {
    setCurrentTeam(team);
    setSelectedCaptainId('');
    setChangingCaptain(false);
    
    try {
      // Fetch team members
      const { data, error } = await supabase
        .from('team_players')
        .select(`
          user_id,
          players:user_id (
            id,
            display_name,
            email
          )
        `)
        .eq('team_id', team.id);
        
      if (error) throw error;
      
      setTeamMembers(data || []);
      setShowCaptainModal(true);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };
  
  const handleChangeCaptain = async () => {
    if (!currentTeam || !selectedCaptainId) return;
    
    try {
      setChangingCaptain(true);
      console.log('Changing captain for team:', currentTeam.id);
      console.log('Old captain ID:', currentTeam.captain_id);
      console.log('New captain ID:', selectedCaptainId);
      
      // Update team captain
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({ captain_id: selectedCaptainId })
        .eq('id', currentTeam.id);
        
      if (updateTeamError) {
        console.error('Error updating team captain:', updateTeamError);
        throw updateTeamError;
      }
      
      // Update old captain's role
      const { error: updateOldCaptainError } = await supabase
        .from('team_players')
        .update({ 
          role: 'player',
          can_be_deleted: true 
        })
        .eq('team_id', currentTeam.id)
        .eq('user_id', currentTeam.captain_id);
        
      if (updateOldCaptainError) {
        console.error('Error updating old captain role:', updateOldCaptainError);
        throw updateOldCaptainError;
      }
      
      // Update new captain's role
      const { error: updateNewCaptainError } = await supabase
        .from('team_players')
        .update({ 
          role: 'captain',
          can_be_deleted: false 
        })
        .eq('team_id', currentTeam.id)
        .eq('user_id', selectedCaptainId);
        
      if (updateNewCaptainError) {
        console.error('Error updating new captain role:', updateNewCaptainError);
        throw updateNewCaptainError;
      }
      
      // Create a team change request record for audit
      const requestId = uuidv4();
      const { error: createRequestError } = await supabase
        .from('team_change_requests')
        .insert({
          id: requestId,
          team_id: currentTeam.id,
          request_type: 'team_transfer',
          requested_by: 'owner', // Indicate this was done by an owner
          player_id: selectedCaptainId,
          old_value: currentTeam.captain_id,
          new_value: selectedCaptainId,
          status: 'approved',
          payment_id: null, // No payment for owner actions
          item_id: null,
          metadata: {
            teamName: currentTeam.name,
            oldCaptainId: currentTeam.captain_id,
            newCaptainId: selectedCaptainId,
            changedByOwner: true,
            timestamp: new Date().toISOString()
          }
        });
        
      if (createRequestError) {
        console.error('Error creating team change request:', createRequestError);
        // Continue even if audit record fails
      }
      
      // Refresh team list
      await fetchTeams();
      setShowCaptainModal(false);
    } catch (error) {
      console.error('Error changing team captain:', error);
    } finally {
      setChangingCaptain(false);
    }
  };

  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
            <Link to="/admin" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Admin Panel
            </Link>
            <Link to="/dashboard" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <User2 className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-700 border-gray-600 rounded-md pl-10 pr-4 py-2 text-white placeholder-gray-400"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <button
                type="submit"
                className="ml-2 bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Search
              </button>
            </form>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 text-gray-400 mr-2" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Team Name
                  {sortField === 'name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('captain_name')}
                >
                  Captain
                  {sortField === 'captain_name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('member_count')}
                >
                  Members
                  {sortField === 'member_count' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {sortField === 'status' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  Created
                  {sortField === 'created_at' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    Loading teams...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    No teams found
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{team.name}</div>
                          <div className="text-sm text-gray-400">{team.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {team.captain_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {team.member_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        team.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : team.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {team.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(team.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleCaptainClick(team)}
                        className="text-blue-500 hover:text-blue-400 mr-3"
                        title="Change Captain"
                      >
                        <Users className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditClick(team)}
                        className="text-green-500 hover:text-green-400 mr-3"
                        title="Edit Team"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(team)}
                        className="text-red-500 hover:text-red-400"
                        title="Delete Team"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Team Modal */}
      {showEditModal && currentTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Edit Team</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Modal */}
      {showDeleteModal && currentTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Delete Team</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete {currentTeam.name}? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Captain Modal */}
      {showCaptainModal && currentTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Change Team Captain</h3>
              <button
                onClick={() => setShowCaptainModal(false)}
                className="text-gray-400 hover:text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-gray-300 mb-2">
                Current captain: <span className="text-white font-medium">{currentTeam.captain_name}</span>
              </p>
              <p className="text-gray-300 mb-4">
                Select a new team captain from the list below:
              </p>
              
              {teamMembers.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No team members found</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div 
                      key={member.user_id} 
                      className={`flex items-center p-2 rounded ${
                        member.user_id === currentTeam.captain_id 
                          ? 'bg-green-900/20 border border-green-500' 
                          : selectedCaptainId === member.user_id
                          ? 'bg-blue-900/20 border border-blue-500'
                          : 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (member.user_id !== currentTeam.captain_id) {
                          setSelectedCaptainId(member.user_id);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {member.players?.display_name || member.user_id}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {member.players?.email || 'No email'}
                        </p>
                      </div>
                      {member.user_id === currentTeam.captain_id && (
                        <span className="text-green-500 text-xs font-medium px-2 py-1 bg-green-500/10 rounded">
                          Current Captain
                        </span>
                      )}
                      {selectedCaptainId === member.user_id && member.user_id !== currentTeam.captain_id && (
                        <span className="text-blue-500 text-xs font-medium px-2 py-1 bg-blue-500/10 rounded">
                          Selected
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCaptainModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeCaptain}
                disabled={!selectedCaptainId || selectedCaptainId === currentTeam.captain_id || changingCaptain}
                className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {changingCaptain ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Changing...
                  </>
                ) : (
                  'Change Captain'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTeams;