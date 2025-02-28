import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Search, Filter, UserPlus, Shield, X, Check, AlertTriangle, Home, User2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
  avatar_url: string | null;
}

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('display_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    role: '',
    status: ''
  });
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'user'
  });
  const [addUserError, setAddUserError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, sortField, sortDirection]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get player profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('players')
        .select('*');

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedUsers = profiles.map(profile => {
        return {
          id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          role: profile.role || 'user',
          status: profile.status || 'active',
          created_at: profile.created_at,
          avatar_url: profile.avatar_url
        };
      });

      // Apply filters and sorting
      let filteredUsers = combinedUsers;
      
      if (statusFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
      }

      // Sort users
      filteredUsers.sort((a, b) => {
        const fieldA = a[sortField as keyof User] || '';
        const fieldB = b[sortField as keyof User] || '';
        
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          return sortDirection === 'asc' 
            ? fieldA.localeCompare(fieldB)
            : fieldB.localeCompare(fieldA);
        }
        
        return 0;
      });

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter users based on search term
    const filtered = users.filter(user => 
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setUsers(filtered);
    
    // If search term is empty, fetch all users again
    if (!searchTerm) {
      fetchUsers();
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

  const handleEditClick = (user: User) => {
    setCurrentUser(user);
    setFormData({
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (user: User) => {
    setCurrentUser(user);
    setShowDeleteModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      // Update player profile
      const { error: profileError } = await supabase
        .from('players')
        .update({
          display_name: formData.display_name,
          email: formData.email,
          status: formData.status,
          role: formData.role
        })
        .eq('user_id', currentUser.id);

      if (profileError) throw profileError;

      // Refresh user list
      fetchUsers();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentUser) return;

    try {
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(
        currentUser.id
      );

      if (authError) {
        console.error('Error deleting auth user:', authError);
        // If we can't delete the auth user, at least update the status to banned
        const { error: updateError } = await supabase
          .from('players')
          .update({ status: 'banned' })
          .eq('user_id', currentUser.id);
          
        if (updateError) throw updateError;
      }

      // Refresh user list
      fetchUsers();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAddUserError('');

    try {
      // Create the user with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No user data returned');
      }

      // Set the user's role if it's admin
      if (newUserData.role === 'admin') {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          authData.user.id,
          { user_metadata: { role: 'admin' } }
        );

        if (updateError) throw updateError;
      }

      // Create player profile
      const { error: profileError } = await supabase
        .from('players')
        .insert({
          user_id: authData.user.id,
          display_name: newUserData.display_name || newUserData.email.split('@')[0],
          email: newUserData.email,
          role: newUserData.role
        });

      if (profileError) throw profileError;

      // Refresh user list and close modal
      fetchUsers();
      setShowAddUserModal(false);
      setNewUserData({
        email: '',
        password: '',
        display_name: '',
        role: 'user'
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      setAddUserError(error.message || 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <Link to="/admin" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Admin Panel
            </Link>
            <Link to="/dashboard" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <User2 className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search users..."
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
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('display_name')}
                >
                  Name
                  {sortField === 'display_name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('email')}
                >
                  Email
                  {sortField === 'email' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('role')}
                >
                  Role
                  {sortField === 'role' && (
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
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <span className="text-gray-400">{user.display_name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.display_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : user.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="text-green-500 hover:text-green-400 mr-3"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Add New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              {addUserError && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
                  {addUserError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newUserData.display_name}
                    onChange={(e) => setNewUserData({...newUserData, display_name: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
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
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && currentUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Edit User</h3>
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
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
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
                    <option value="banned">Banned</option>
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

      {/* Delete User Modal */}
      {showDeleteModal && currentUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete {currentUser.display_name}? This action cannot be undone.
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

export default AdminUsers;