import React from 'react';
import { useAuthStore } from '../../store/authStore';
import ItemsManagement from '../../components/ItemsManagement';

const AdminPanel = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="mt-2 text-gray-300">
              Please log in to access the admin panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Panel</h1>
        
        {/* Items Management Section */}
        <div className="mb-8">
          <ItemsManagement isOwner={false} />
        </div>

        {/* Add other admin sections here */}
      </div>
    </div>
  );
};

export default AdminPanel; 