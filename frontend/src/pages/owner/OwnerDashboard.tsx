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
  Package,
  Home
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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
  { name: 'Active Teams', value: '234', change: '+8%', icon: Trophy },
  { name: 'Revenue', value: '$45,678', change: '+23%', icon: DollarSign },
  { name: 'Items Sold', value: '1,234', change: '+15%', icon: Package }
];

const OwnerDashboard = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const showDashboard = location.pathname === '/owner';

  if (!user) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="mt-2 text-gray-300">
              Please log in to access the owner dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { name: 'Dashboard', icon: Home, href: '/owner' },
    { name: 'Users', icon: Users, href: '/owner/users' },
    { name: 'Tournaments', icon: Trophy, href: '/owner/tournaments' },
    { name: 'Teams', icon: Users, href: '/owner/teams' },
    { name: 'Players', icon: User2, href: '/owner/players' },
    { name: 'News', icon: Newspaper, href: '/owner/news' },
    { name: 'Leagues', icon: Trophy, href: '/owner/leagues' },
    { name: 'Items', icon: Package, href: '/owner/items' },
    { name: 'Sponsors', icon: DollarSign, href: '/owner/sponsors' },
    { name: 'Admin Management', icon: Shield, href: '/owner/admins' },
    { name: 'Site Content', icon: BarChart2, href: '/owner/site-content' },
    { name: 'Settings', icon: Settings, href: '/owner/settings' },
  ];

  return (
    <div className="bg-gray-900 min-h-screen">
      {/* Owner Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">Owner Dashboard</h1>
            <div className="h-8 w-0.5 bg-green-500/30" />
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-500">
                Owner Access
              </span>
            </div>
          </div>
          <div className="flex space-x-4">
            <Link 
              to="/owner/news" 
              className="text-gray-300 hover:text-green-500 transition-colors duration-200"
            >
              <Newspaper className="w-5 h-5" />
            </Link>
            <Link 
              to="/owner/settings" 
              className="text-gray-300 hover:text-green-500 transition-colors duration-200"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-800 min-h-screen p-4 border-r border-gray-700">
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  location.pathname === item.href
                    ? 'bg-green-500/10 text-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-green-500'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
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
                  <div key={stat.name} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500/50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{stat.name}</p>
                        <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <stat.icon className="w-8 h-8 text-green-500" />
                      </div>
                    </div>
                    <p className="text-green-500 text-sm mt-2">{stat.change} from last month</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500/50 transition-colors duration-200">
                <h3 className="text-xl font-semibold text-white mb-4">Overview</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.375rem'
                        }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <Area type="monotone" dataKey="users" stroke="#10B981" fill="#059669" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="matches" stroke="#3B82F6" fill="#2563EB" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="tournaments" stroke="#6366F1" fill="#4F46E5" fillOpacity={0.2} />
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
};

export default OwnerDashboard; 