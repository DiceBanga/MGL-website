import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { TowerControl as GameController, Calendar, Trophy, Users, BarChart2, User2, Twitter, Instagram, Youtube, Facebook, Twitch, MessageSquare, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/images/logo.svg';
import backgroundPattern from '../assets/images/background.svg';

interface UserProfile {
  display_name: string;
  avatar_url: string | null;
}

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { isAdmin, isOwner } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('players')
      .select('display_name, avatar_url')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!error && data) {
      setUserProfile(data);
    } else {
      // If no profile exists, create one with default values
      const defaultProfile = {
        display_name: user?.email?.split('@')[0] || 'User',
        avatar_url: null
      };
      
      const { error: insertError } = await supabase
        .from('players')
        .insert({
          user_id: user?.id,
          display_name: defaultProfile.display_name,
          email: user?.email
        });

      if (!insertError) {
        setUserProfile(defaultProfile);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
  };

  // Show admin nav if user is either admin or owner
  const showAdminNav = isAdmin || isOwner;

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${backgroundPattern})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Navigation Bar */}
      <nav className="bg-black/80 backdrop-blur-sm border-b border-green-700 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/">
                <img 
                  src={logo} 
                  alt="MGL Logo" 
                  className="h-12 w-auto"
                  style={{
                    filter: 'brightness(0) invert(1)', // Make the logo white
                    maxWidth: '150px'
                  }}
                />
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-center space-x-8">
                  <Link to="/games" className={`${location.pathname === '/games' ? 'text-green-500' : 'text-gray-300'} hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium flex items-center`}>
                    <GameController className="w-4 h-4 mr-2" />
                    Games
                  </Link>
                  <Link to="/schedule" className={`${location.pathname === '/schedule' ? 'text-green-500' : 'text-gray-300'} hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium flex items-center`}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </Link>
                  <Link to="/tournaments" className={`${location.pathname === '/tournaments' ? 'text-green-500' : 'text-gray-300'} hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium flex items-center`}>
                    <Trophy className="w-4 h-4 mr-2" />
                    Tournaments
                  </Link>
                  <Link to="/teams" className={`${location.pathname === '/teams' ? 'text-green-500' : 'text-gray-300'} hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium flex items-center`}>
                    <Users className="w-4 h-4 mr-2" />
                    Teams
                  </Link>
                  <Link to="/players" className={`${location.pathname === '/players' ? 'text-green-500' : 'text-gray-300'} hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium flex items-center`}>
                    <User2 className="w-4 h-4 mr-2" />
                    Players
                  </Link>
                  <Link to="/stats" className={`${location.pathname === '/stats' ? 'text-green-500' : 'text-gray-300'} hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium flex items-center`}>
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Stats
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative group">
                  <button
                    className="flex items-center space-x-3 text-white hover:text-green-400 px-4 py-2 rounded-md text-sm font-medium"
                    onMouseEnter={() => setShowDropdown(true)}
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={userProfile.display_name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <User2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <span>{userProfile?.display_name || 'User'}</span>
                  </button>

                  <div 
                    className={`absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 ${showDropdown ? 'block' : 'hidden'}`}
                    onMouseEnter={() => setShowDropdown(true)}
                    onMouseLeave={() => setShowDropdown(false)}
                  >
                    {showAdminNav && (
                      <>
                        {isOwner ? (
                          <Link
                            to="/owner"
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Owner Dashboard
                          </Link>
                        ) : (
                          <Link
                            to="/admin"
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Admin Panel
                          </Link>
                        )}
                      </>
                    )}
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                    >
                      <User2 className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                    <Link
                      to={`/user/${user.id}`}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-white hover:text-green-400 px-4 py-2 rounded-md text-sm font-medium">
                    Login
                  </Link>
                  <Link to="/register" className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-black/80 backdrop-blur-sm mt-auto border-t border-green-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">About MGL</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className="text-gray-400 hover:text-green-500">About Us</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-400 hover:text-green-500">Contact Us</Link>
                </li>
                <li>
                  <Link to="/faq" className="text-gray-400 hover:text-green-500">FAQ</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="text-gray-400 hover:text-green-500">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-400 hover:text-green-500">Terms of Service</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/help" className="text-gray-400 hover:text-green-500">Help Center</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-400 hover:text-green-500">Contact Support</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="https://twitter.com/MilitaGamingLeague" className="text-gray-400 hover:text-green-500 transition-colors">
                  <Twitter className="w-6 h-6" />
                </a>
                <a href="https://instagram.com/MilitaGamingLeague" className="text-gray-400 hover:text-green-500 transition-colors">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="https://discord.gg/MilitaGamingLeague" className="text-gray-400 hover:text-green-500 transition-colors">
                  <MessageSquare className="w-6 h-6" />
                </a>
                <a href="https://youtube.com/MilitaGamingLeague" className="text-gray-400 hover:text-green-500 transition-colors">
                  <Youtube className="w-6 h-6" />
                </a>
                <a href="https://twitch.tv/MilitaGamingLeague" className="text-gray-400 hover:text-green-500 transition-colors">
                  <Twitch className="w-6 h-6" />
                </a>
                <a href="https://facebook.com/MilitaGamingLeague" className="text-gray-400 hover:text-green-500 transition-colors">
                  <Facebook className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="text-center text-gray-400 text-sm">
            © 2024 Militia Gaming League. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;