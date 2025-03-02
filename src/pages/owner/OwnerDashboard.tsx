import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Trophy, Settings, FileText, DollarSign, Home } from 'lucide-react';

function OwnerDashboard() {
  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Owner Dashboard</h1>
          <div className="flex space-x-4">
            <Link to="/admin" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Admin Panel
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/owner/users" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700">
            <Users className="w-8 h-8 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-white">User Management</h2>
            <p className="text-gray-400 mt-2">Manage users and permissions</p>
          </Link>

          <Link to="/owner/tournaments" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700">
            <Trophy className="w-8 h-8 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-white">Tournaments</h2>
            <p className="text-gray-400 mt-2">Manage tournaments and events</p>
          </Link>

          <Link to="/owner/settings" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700">
            <Settings className="w-8 h-8 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <p className="text-gray-400 mt-2">Configure system settings</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard; 