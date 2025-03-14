import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Home, Shield, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Admin {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  status: string;
}

function OwnerManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    display_name: '',
    password: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('role', 'admin');

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          data: {
            role: 'admin'
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No user data returned');
      }

      // Create player profile
      const { error: profileError } = await supabase
        .from('players')
        .insert({
          user_id: authData.user.id,
          display_name: newAdmin.display_name || newAdmin.email.split('@')[0],
          email: newAdmin.email,
          role: 'admin'
        });

      if (profileError) throw profileError;

      // Refresh admin list
      fetchAdmins();
      setShowAddModal(false);
      setNewAdmin({
        email: '',
        display_name: '',
        password: ''
      });
    } catch (error: any) {
      console.error('Error creating admin:', error);
      setError(error.message || 'Error creating admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      // Update user role to 'user'
      const { error } = await supabase
        .from('players')
        .update({ role: 'user' })
        .eq('id', adminId);

      if (error) throw error;

      // Refresh admin list
      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
    }
  };

  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Admin Management</h1>
            <Link to="/owner" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Owner Dashboard
            </Link>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Admin
          </button>
        </div>

        {/* Admin List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {admin.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={admin.avatar_url} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{admin.display_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{admin.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      Remove Admin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Add New Admin</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddAdmin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
                      aria-label="Email"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={newAdmin.display_name}
                      onChange={(e) => setNewAdmin({...newAdmin, display_name: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      aria-label="Display Name"
                      placeholder="Enter display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                      required
                      aria-label="Password"
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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
                        Create Admin
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerManagement; 