import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, User2, Trophy, Home } from 'lucide-react';

const players = [
  {
    id: 1,
    name: "Michael Jordan",
    team: "NYC Dragons",
    position: "SG",
    rating: 99,
    gamesPlayed: 32,
    status: "active"
  },
  {
    id: 2,
    name: "LeBron James",
    team: "LA Knights",
    position: "SF",
    rating: 98,
    gamesPlayed: 30,
    status: "active"
  }
];

function AdminPlayers() {
  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Manage Players</h1>
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
            Add Player
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Player Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Games Played
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{player.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{player.team}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {player.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {player.rating}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {player.gamesPlayed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {player.status}
                    </span>
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

export default AdminPlayers;