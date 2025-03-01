import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Trophy,
  GamepadIcon,
  Calendar,
  Newspaper,
  Settings,
  TrendingUp,
  DollarSign,
  Shield,
  User2,
  UserCog,
  Trash2,
  BadgeDollarSign,
  Database,
  LineChart,
  Building
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

// Sample data - replace with real data from your backend
const data = [
  { name: 'Jan', revenue: 40000, expenses: 24000, profit: 16000 },
  { name: 'Feb', revenue: 30000, expenses: 13980, profit: 16020 },
  { name: 'Mar', revenue: 20000, expenses: 9800, profit: 10200 },
  { name: 'Apr', revenue: 27800, expenses: 17080, profit: 10720 },
  { name: 'May', revenue: 18900, expenses: 12800, profit: 6100 },
  { name: 'Jun', revenue: 23900, expenses: 13800, profit: 10100 },
  { name: 'Jul', revenue: 34900, expenses: 20300, profit: 14600 },
];

interface Stat {
  name: string;
  value: string;
  change: string;
  icon: React.ElementType;
}

function OwnerDashboard() {
  const [stats, setStats] = useState<Stat[]>([
    { name: 'Total Revenue', value: '$0', change: '+0%', icon: DollarSign },
    { name: 'Active Admins', value: '0', change: '+0%', icon: Shield },
    { name: 'Total Users', value: '0', change: '+0%', icon: Users },
    { name: 'Sponsors', value: '0', change: '+0%', icon: Building },
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch admin count
      const { count: adminCount } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true });

      // Fetch user count
      const { count: userCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true });

      // Fetch sponsor count
      const { count: sponsorCount } = await supabase
        .from('sponsors')
        .select('*', { count: 'exact', head: true });

      // Update stats with real data
      setStats([
        { name: 'Total Revenue', value: '$145,678', change: '+25%', icon: DollarSign },
        { name: 'Active Admins', value: adminCount?.toString() || '0', change: '+2%', icon: Shield },
        { name: 'Total Users', value: userCount?.toString() || '0', change: '+12%', icon: Users },
        { name: 'Sponsors', value: sponsorCount?.toString() || '0', change: '+5%', icon: Building },
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Owner Dashboard</h1>
            <Link to="/admin" className="bg-purple-700 text-white px-4 py-2 rounded-md hover:bg-purple-600 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Admin View
            </Link>
          </div>
          <div className="flex space-x-4">
            <button className="bg-red-700 text-white px-4 py-2 rounded-md hover:bg-red-600 flex items-center">
              <Trash2 className="w-5 h-5 mr-2" />
              Clear Data
            </button>
            <Link
              to="/owner/settings"
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
                <div className="bg-purple-500/10 p-3 rounded-lg">
                  <stat.icon className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-purple-500 mr-1" />
                <span className="text-purple-500 text-sm">{stat.change} from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Chart */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Financial Overview</h2>
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
                  dataKey="revenue"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Owner Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/owner/admins"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <UserCog className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Admin Management</h3>
            <p className="text-gray-400">Create, edit, and manage admin accounts.</p>
          </Link>

          <Link
            to="/owner/finances"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <BadgeDollarSign className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Financial Management</h3>
            <p className="text-gray-400">View and manage all financial transactions.</p>
          </Link>

          <Link
            to="/owner/sponsors"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <Building className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Sponsor Management</h3>
            <p className="text-gray-400">Manage sponsorships and partnerships.</p>
          </Link>

          <Link
            to="/owner/analytics"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <LineChart className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Advanced Analytics</h3>
            <p className="text-gray-400">View detailed site metrics and user behavior.</p>
          </Link>

          <Link
            to="/owner/database"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <Database className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Database Management</h3>
            <p className="text-gray-400">Manage database operations and backups.</p>
          </Link>

          <Link
            to="/owner/system"
            className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">System Settings</h3>
            <p className="text-gray-400">Configure global system settings and permissions.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard; 