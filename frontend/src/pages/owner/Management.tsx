import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Home } from 'lucide-react';

function OwnerManagement() {
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
          <button className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Admin
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Admin list table will go here */}
        </div>
      </div>
    </div>
  );
}

export default OwnerManagement; 