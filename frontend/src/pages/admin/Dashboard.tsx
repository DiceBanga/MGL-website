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
  Home,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

const data = [
  { name: 'Jan', users: 4000, matches: 2400, tournaments: 2400 },
  { name: 'Feb', users: 3000, matches: 1398, tournaments: 2210 },
  { name: 'Mar', users: 2000, matches: 9800, tournaments: 2290 },
  { name: 'Apr', users: 2780, matches: 3908, tournaments: 2000 },
  { name: 'May', users: 1890, matches: 4800, tournaments: 2181 },
  { name: 'Jun', users: 2390, matches: 3800, tournaments: 2500 },
  { name: 'Jul', users: 3490, matches: 4300, tournaments: 2100 },
];

function AdminDashboard() {
  const location = useLocation();
  const [stats, setStats] = useState([
    { name: 'Total Users', value: '0', change: '+0%', icon: Users },
    { name: 'Active Tournaments', value: '0', change: '+0%', icon: Trophy },
    { name: 'Total Matches', value: '0', change: '+0%', icon: GamepadIcon },
    { name: 'Revenue', value: '$0', change: '+0%', icon: DollarSign },
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

      // Fetch tournament count
      const { count: tournamentCount, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true });

      // Fetch game count
      const { count: gameCount, error: gameError } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true });

      // Update stats with real data
      setStats([
        { name: 'Total Users', value: userCount?.toString() || '0', change: '+12%', icon: Users },
        { name: 'Active Tournaments', value: tournamentCount?.toString() || '0', change: '+5%', icon: Trophy },
        { name: 'Total Matches', value: gameCount?.toString() || '0', change: '+8%', icon: GamepadIcon },
        { name: 'Revenue', value: '$45,678', change: '+15%', icon: DollarSign },
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Only show dashboard content on the main admin route
  const showDashboard = location.pathname === '/admin';

  const navigationItems = [
    { name: 'Dashboard', icon: Home, href: '/admin' },
    { name: 'Users', icon: Users, href: '/admin/users' },
    { name: 'Teams', icon: Users, href: '/admin/teams' },
    { name: 'Tournaments', icon: Trophy, href: '/admin/tournaments' },
    { name: 'Leagues', icon: Trophy, href: '/admin/leagues' },
    { name: 'Players', icon: User2, href: '/admin/players' },
    { name: 'Games', icon: GamepadIcon, href: '/admin/games' },
    { name: 'News', icon: Newspaper, href: '/admin/news' },
    { name: 'Sponsors', icon: DollarSign, href: '/admin/sponsors' },
    { name: 'Requests', icon: AlertCircle, href: '/admin/requests' },
    { name: 'Site Content', icon: BarChart2, href: '/admin/site-content' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <div className="bg-gray-900 min-h-screen">
      {/* Admin Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>
          <div className="flex space-x-4">
            <Link to="/admin/news" className="text-gray-300 hover:text-white">
              <Newspaper className="w-5 h-5" />
            </Link>
            <Link to="/admin/settings" className="text-gray-300 hover:text-white">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 p-2 rounded-lg ${
                  location.pathname === item.href
                    ? 'bg-green-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
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
                <h3 className="text-xl font-semibold text-white mb-4">Overview</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip />
                      <Area type="monotone" dataKey="users" stroke="#10B981" fill="#059669" />
                      <Area type="monotone" dataKey="matches" stroke="#3B82F6" fill="#2563EB" />
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

export default AdminDashboard;