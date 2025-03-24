import React from 'react';
import RequestsManager from '../../components/RequestsManager';

const AdminRequests = () => {
  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Manage Requests</h1>
        <RequestsManager isOwner={false} />
      </div>
    </div>
  );
};

export default AdminRequests; 