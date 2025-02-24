import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Trophy,
  GamepadIcon,
  Calendar,
  BarChart2,
  Newspaper,
  Settings,
  TrendingUp,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', users: 4000, matches: 2400, tournaments: 2400 },
  { name: 'Feb', users: 3000, matches: 1398, tournaments: 2210 },
  { name: 'Mar', users: 2000, matches: 9800, tournaments: 2290 },
  { name: 'Apr', users: 2780, matches: 3908, tournaments: 2000 },
  { name: 'May', users: 1890, matches: 4800, tournaments: 2181 },
  { name: 'Jun', users: 2390, matches: 3800, tournaments: 2500 },
  { name: 'Jul', users: 3490, matches: 4300, tournaments: 2100 },
];

const stats = [
  { name: 'Total Users', value: '12,345', change: '+12%', icon: Users },
  { name: 'Active Tournaments', value: '23', change: '+5%', icon: Trophy },
  { name: 'Total Matches', value: '1,234', change: '+8%', icon: GamepadIcon },
  { name: 'Revenue', value: '$45,678', change: '+15%', icon: DollarSign },
];

function AdminDashboard() {
  return (
    <div className="bg-gray-900 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <div className="flex space-x-4">
            <button className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600">
              Export Report
            </button>
            <Link
              to="/admin/settings"
              className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.name}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className="bg-green-500/10 p-3 rounded-lg">
                  <stat.icon className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500 text-sm">{stat.change} from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Chart */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Activity Overview</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="matches"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="tournaments"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/admin/tournaments"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <Trophy className="w-8 h-8 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Manage Tournaments</h3>
            <p className="text-gray-400">Create and manage tournaments, set rules and schedules.</p>
          </Link>

          <Link
            to="/admin/teams"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <Users className="w-8 h-8 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Team Management</h3>
            <p className="text-gray-400">Review team applications and manage rosters.</p>
          </Link>

          <Link
            to="/admin/news"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <Newspaper className="w-8 h-8 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">News & Updates</h3>
            <p className="text-gray-400">Publish news articles and announcements.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;