import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Home, User2 } from 'lucide-react';

const leagues = [
  {
    id: 1,
    name: "NBA 2K Pro League",
    description: "Professional NBA 2K esports league",
    status: "active",
    teams: 16,
    players: 128,
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    name: "Amateur Division",
    description: "Competitive league for amateur players",
    status: "active",
    teams: 24,
    players: 192,
    createdAt: "2024-02-01"
  }
];

function AdminLeagues() {
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
          <button className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
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
              {leagues.map((league) => (
                <tr key={league.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{league.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{league.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {league.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {league.teams}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {league.players}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {league.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-green-500 hover:text-green-400 mr-3">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="text-red-500 hover:text-red-400">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminLeagues;