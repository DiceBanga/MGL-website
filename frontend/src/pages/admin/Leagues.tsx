import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Home, User2, AlertTriangle, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface League {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  teams_count?: number;
  players_count?: number;
  registration_start_date?: string;
  season_start_date?: string;
  playoff_start_date?: string;
  entry_fee?: number;
  late_entry_fee?: number;
  prize_amount?: number;
}

function AdminLeagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentLeague, setCurrentLeague] = useState<League | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    registration_start_date: '',
    season_start_date: '',
    playoff_start_date: '',
    entry_fee: 100,
    late_entry_fee: 150,
    prize_amount: 1000
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*');

      if (error) throw error;

      // For demo purposes, using static stats
      // In production, these would come from the database
      const leaguesWithCounts = await Promise.all((data || []).map(async (league) => {
        // Get teams count
        const { count: teamsCount, error: teamsError } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id);

        if (teamsError) console.error('Error fetching teams count:', teamsError);

        // Get players count (approximate by multiplying teams by average team size)
        const playersCount = teamsCount ? teamsCount * 8 : 0;

        return {
          ...league,
          teams_count: teamsCount || 0,
          players_count: playersCount
        };
      }));

      setLeagues(leaguesWithCounts);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    // Set default dates to today + offset days
    const today = new Date();
    const registrationStart = new Date(today);
    const seasonStart = new Date(today);
    const playoffStart = new Date(today);
    
    // Set registration to start today
    const registrationDate = registrationStart.toISOString().split('T')[0];
    
    // Set season to start in 14 days
    seasonStart.setDate(today.getDate() + 14);
    const seasonDate = seasonStart.toISOString().split('T')[0];
    
    // Set playoffs to start in 60 days
    playoffStart.setDate(today.getDate() + 60);
    const playoffDate = playoffStart.toISOString().split('T')[0];
    
    setFormData({
      name: '',
      description: '',
      status: 'active',
      registration_start_date: registrationDate,
      season_start_date: seasonDate,
      playoff_start_date: playoffDate,
      entry_fee: 100,
      late_entry_fee: 150,
      prize_amount: 1000
    });
    setShowCreateModal(true);
  };

  const handleEditClick = (league: League) => {
    setCurrentLeague(league);
    setFormData({
      name: league.name,
      description: league.description || '',
      status: league.status,
      registration_start_date: league.registration_start_date || '',
      season_start_date: league.season_start_date || '',
      playoff_start_date: league.playoff_start_date || '',
      entry_fee: league.entry_fee || 100,
      late_entry_fee: league.late_entry_fee || 150,
      prize_amount: league.prize_amount || 1000
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (league: League) => {
    setCurrentLeague(league);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          registration_start_date: formData.registration_start_date,
          season_start_date: formData.season_start_date,
          playoff_start_date: formData.playoff_start_date,
          entry_fee: formData.entry_fee,
          late_entry_fee: formData.late_entry_fee,
          prize_amount: formData.prize_amount
        })
        .select();

      if (error) throw error;

      // Refresh league list
      fetchLeagues();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating league:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLeague) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('leagues')
        .update({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          registration_start_date: formData.registration_start_date,
          season_start_date: formData.season_start_date,
          playoff_start_date: formData.playoff_start_date,
          entry_fee: formData.entry_fee,
          late_entry_fee: formData.late_entry_fee,
          prize_amount: formData.prize_amount
        })
        .eq('id', currentLeague.id);

      if (error) throw error;

      // Refresh league list
      fetchLeagues();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating league:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentLeague) return;

    try {
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', currentLeague.id);

      if (error) throw error;

      // Refresh league list
      fetchLeagues();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting league:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Manage Leagues</h1>
            <Link to="/admin" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Admin Panel
            </Link>
            <Link to="/dashboard" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <User2 className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
          </div>
          <button 
            onClick={handleCreateClick}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create League
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  League Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    Loading leagues...
                  </td>
                </tr>
              ) : leagues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    No leagues found. Create a league to get started.
                  </td>
                </tr>
              ) : (
                leagues.map((league) => (
                  <tr key={league.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{league.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{league.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        league.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : league.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {league.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {league.teams_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {league.players_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(league.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(league)}
                        className="text-green-500 hover:text-green-400 mr-3"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(league)}
                        className="text-red-500 hover:text-red-400"
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

      {/* Create League Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Create League</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    League Name
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Registration Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.registration_start_date}
                      onChange={(e) => setFormData({...formData, registration_start_date: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Season Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.season_start_date}
                      onChange={(e) => setFormData({...formData, season_start_date: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Playoff Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.playoff_start_date}
                      onChange={(e) => setFormData({...formData, playoff_start_date: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Entry Fee ($)
                    </label>
                    <input
                      type="number"
                      value={formData.entry_fee}
                      onChange={(e) => setFormData({...formData, entry_fee: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Late Entry Fee ($)
                    </label>
                    <input
                      type="number"
                      value={formData.late_entry_fee}
                      onChange={(e) => setFormData({...formData, late_entry_fee: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Prize Amount ($)
                    </label>
                    <input
                      type="number"
                      value={formData.prize_amount}
                      onChange={(e) => setFormData({...formData, prize_amount: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 flex items-center disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Create League
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit League Modal */}
      {showEditModal && currentLeague && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Edit League</h3>
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
                    League Name
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Registration Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.registration_start_date}
                      onChange={(e) => setFormData({...formData, registration_start_date: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Season Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.season_start_date}
                      onChange={(e) => setFormData({...formData, season_start_date: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Playoff Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.playoff_start_date}
                      onChange={(e) => setFormData({...formData, playoff_start_date: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Entry Fee ($)
                    </label>
                    <input
                      type="number"
                      value={formData.entry_fee}
                      onChange={(e) => setFormData({...formData, entry_fee: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Late Entry Fee ($)
                    </label>
                    <input
                      type="number"
                      value={formData.late_entry_fee}
                      onChange={(e) => setFormData({...formData, late_entry_fee: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Prize Amount ($)
                    </label>
                    <input
                      type="number"
                      value={formData.prize_amount}
                      onChange={(e) => setFormData({...formData, prize_amount: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
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
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 flex items-center disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete League Modal */}
      {showDeleteModal && currentLeague && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Delete League</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete {currentLeague.name}? This action cannot be undone.
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
    </div>
  );
}

export default AdminLeagues;