import React from 'react';
import { BarChart2, TrendingUp, Trophy, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'NYC Dragons', points: 110, assists: 24, rebounds: 45 },
  { name: 'LA Knights', points: 108, assists: 22, rebounds: 42 },
  { name: 'CHI Winds', points: 102, assists: 20, rebounds: 38 },
  { name: 'MIA Heat', points: 98, assists: 18, rebounds: 36 },
  { name: 'BOS Rebels', points: 96, assists: 16, rebounds: 34 },
];

function Stats() {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Statistics</h1>
          <div className="flex space-x-4">
            <select className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              <option>Team Stats</option>
              <option>Player Stats</option>
              <option>League Leaders</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Stats Chart */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6">Team Performance</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="points" fill="#10B981" />
                  <Bar dataKey="assists" fill="#3B82F6" />
                  <Bar dataKey="rebounds" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Categories */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Points Per Game</h3>
                <BarChart2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-4">
                {data.slice(0, 3).map((team, index) => (
                  <div key={team.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-gray-400 w-6">{index + 1}.</span>
                      <span className="text-white">{team.name}</span>
                    </div>
                    <span className="text-green-500 font-semibold">{team.points}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Assists Per Game</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-4">
                {data.slice(0, 3).map((team, index) => (
                  <div key={team.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-gray-400 w-6">{index + 1}.</span>
                      <span className="text-white">{team.name}</span>
                    </div>
                    <span className="text-green-500 font-semibold">{team.assists}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Rebounds Per Game</h3>
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-4">
                {data.slice(0, 3).map((team, index) => (
                  <div key={team.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-gray-400 w-6">{index + 1}.</span>
                      <span className="text-white">{team.name}</span>
                    </div>
                    <span className="text-green-500 font-semibold">{team.rebounds}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;