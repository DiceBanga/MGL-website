import React from 'react';
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
  Package
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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
    { name: 'Users', icon: Users, href: '/owner/users' },
    { name: 'Tournaments', icon: Trophy, href: '/owner/tournaments' },
    { name: 'Teams', icon: Users, href: '/owner/teams' },
    { name: 'Players', icon: User2, href: '/owner/players' },
    { name: 'News', icon: Newspaper, href: '/owner/news' },
    { name: 'Leagues', icon: Trophy, href: '/owner/leagues' },
    { name: 'Items', icon: Package, href: '/owner/items' },
    { name: 'Sponsors', icon: DollarSign, href: '/owner/sponsors' },
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
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  location.pathname === item.href
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
            <div className="text-white">
              <h2 className="text-xl font-semibold mb-4">Welcome to the Owner Dashboard</h2>
              <p>Select a section from the sidebar to manage your site.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard; 