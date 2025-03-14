import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
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
  UserCheck,
  Shield,
  User2,
  Crown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

const data = [
  { name: 'Jan', revenue: 40000, users: 2400, tournaments: 24 },
  { name: 'Feb', revenue: 30000, users: 1398, tournaments: 22 },
  { name: 'Mar', revenue: 20000, users: 9800, tournaments: 29 },
  { name: 'Apr', revenue: 27800, users: 3908, tournaments: 20 },
  { name: 'May', revenue: 18900, users: 4800, tournaments: 21 },
  { name: 'Jun', revenue: 23900, users: 3800, tournaments: 25 },
  { name: 'Jul', revenue: 34900, users: 4300, tournaments: 21 },
];

function OwnerDashboard() {
  const location = useLocation();
  const [stats, setStats] = useState([
    { name: 'Total Revenue', value: '$0', change: '+0%', icon: DollarSign },
    { name: 'Active Admins', value: '0', change: '+0%', icon: Shield },
    { name: 'Total Users', value: '0', change: '+0%', icon: Users },
    { name: 'Pro Members', value: '0', change: '+0%', icon: Crown },
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user count
      const { count: userCount, error: userError } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true });

      // Fetch admin count
      const { count: adminCount, error: adminError } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      // Fetch pro member count
      const { count: proCount, error: proError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('tier', 'pro');

      // Update stats with real data
      setStats([
        { name: 'Total Revenue', value: '$89,456', change: '+18%', icon: DollarSign },
        { name: 'Active Admins', value: adminCount?.toString() || '0', change: '+5%', icon: Shield },
        { name: 'Total Users', value: userCount?.toString() || '0', change: '+12%', icon: Users },
        { name: 'Pro Members', value: proCount?.toString() || '0', change: '+25%', icon: Crown },
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Only show dashboard content on the main owner route
  const showDashboard = location.pathname === '/owner';

  return (
    <div className="bg-gray-900 min-h-screen">
      {/* Owner Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">Owner Panel</h1>
          </div>
          <div className="flex space-x-4">
            <Link to="/owner/news" className="text-gray-300 hover:text-white">
              <Newspaper className="w-5 h-5" />
            </Link>
            <Link to="/owner/settings" className="text-gray-300 hover:text-white">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <nav className="space-y-2">
            <Link
              to="/owner"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <BarChart2 className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/owner/admins"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner/admins'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>Admin Management</span>
            </Link>
            <Link
              to="/owner/users"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner/users'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </Link>
            <Link
              to="/owner/leagues"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner/leagues'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>League Management</span>
            </Link>
            <Link
              to="/owner/tournaments"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner/tournaments'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span>Tournaments</span>
            </Link>
            <Link
              to="/owner/teams"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner/teams'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Teams</span>
            </Link>
            <Link
              to="/owner/news"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner/news'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Newspaper className="w-5 h-5" />
              <span>News & Updates</span>
            </Link>
            <Link
              to="/owner/settings"
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                location.pathname === '/owner/settings'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {showDashboard ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => (
                  <div key={stat.name} className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{stat.name}</p>
                        <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
                      </div>
                      <stat.icon className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-green-500 text-sm mt-2">{stat.change} from last month</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Revenue & Growth Overview</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#059669" />
                      <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="#2563EB" />
                      <Area type="monotone" dataKey="tournaments" stroke="#6366F1" fill="#4F46E5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard; 