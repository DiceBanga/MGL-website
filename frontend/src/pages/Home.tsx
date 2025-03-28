import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TowerControl as GameController, Calendar, Trophy, Users, ChevronLeft, ChevronRight, BarChart2, User2, Twitter, Instagram, Youtube, Facebook, Twitch, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DbGame } from '../types/database';

const headlines = [
  {
    title: "Season 6 Championship Series Announced",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2940",
    description: "The road to glory begins March 1st. Register your team now!"
  },
  {
    title: "Top Players of the Week",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2940",
    description: "Check out who dominated the virtual courts this week"
  },
  {
    title: "New Tournament Format Revealed",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2940",
    description: "Experience competitive NBA 2K like never before"
  }
];

function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [games, setGames] = useState<DbGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === headlines.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTodayGames();
  }, []);

  const fetchTodayGames = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Define a type for the raw response from Supabase
      interface RawGameResponse {
        id: string;
        home_team_id: string;
        away_team_id: string;
        home_score: number | null;
        away_score: number | null;
        status: 'scheduled' | 'live' | 'completed' | 'cancelled';
        scheduled_at: string;
        created_at: string;
        updated_at: string;
        home_team: { name: string; logo_url: string | null }[];
        away_team: { name: string; logo_url: string | null }[];
      }

      const { data: rawData, error } = await supabase
        .from('games')
        .select(`
          id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status,
          scheduled_at,
          created_at,
          updated_at,
          home_team:home_team_id(name, logo_url),
          away_team:away_team_id(name, logo_url)
        `)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match the DbGame interface
      const transformedGames: DbGame[] = (rawData as RawGameResponse[] || []).map(game => {
        // Use type assertion to handle possibly undefined arrays
        const homeTeam = (game.home_team as any[]) || [];
        const awayTeam = (game.away_team as any[]) || [];
        
        return {
          id: game.id,
          home_team_id: game.home_team_id,
          away_team_id: game.away_team_id,
          home_score: game.home_score,
          away_score: game.away_score,
          status: game.status,
          scheduled_at: game.scheduled_at,
          created_at: game.created_at,
          updated_at: game.updated_at,
          home_team: { 
            name: homeTeam[0]?.name || 'TBD',
            logo_url: homeTeam[0]?.logo_url
          },
          away_team: { 
            name: awayTeam[0]?.name || 'TBD',
            logo_url: awayTeam[0]?.logo_url
          }
        };
      });
      
      setGames(transformedGames);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % headlines.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + headlines.length) % headlines.length);
  };

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York'
    }) + ' ET';
  };

  return (
    <main className="flex-1">
      {/* Scoreboard */}
      <div className="bg-black border-b border-green-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-green-500 font-semibold">Today's Games</h2>
            <div className="flex space-x-2">
              <button 
                className="p-1 rounded-full hover:bg-gray-800"
                title="View Calendar"
                aria-label="View Calendar"
              >
                <Calendar className="w-5 h-5 text-gray-400" />
              </button>
              <Link to="/schedule" className="text-green-500 hover:text-green-400 text-sm font-medium">
                View Full Schedule
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400 text-lg">No Games Scheduled Today</p>
              <Link to="/schedule" className="text-green-500 hover:text-green-400 text-sm font-medium mt-2 inline-block">
                View Full Schedule →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {games.map((game) => (
                <div key={game.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-green-500 font-medium">
                      {game.status === 'scheduled' ? formatGameTime(game.scheduled_at) : game.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">{game.home_team.name}</span>
                      {(game.status === 'live' || game.status === 'completed') && (
                        <span className="text-white font-semibold">{game.home_score}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">{game.away_team.name}</span>
                      {(game.status === 'live' || game.status === 'completed') && (
                        <span className="text-white font-semibold">{game.away_score}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hero Carousel */}
      <div className="relative h-[600px] overflow-hidden">
        {headlines.map((headline, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={headline.image}
              alt={headline.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent">
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-4xl font-bold text-white mb-2">{headline.title}</h2>
                  <p className="text-xl text-gray-200">{headline.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 z-20"
          title="Previous Slide"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 z-20"
          title="Next Slide"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {headlines.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-green-500 scale-125' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              title={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Featured Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link to="/tournaments" className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:bg-gray-700 transition-colors">
            <img
              src="https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=2940"
              alt="Latest Tournament"
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Latest Tournament</h3>
              <p className="text-gray-400">Join the most competitive NBA 2K league in the world.</p>
              <span className="mt-4 text-green-500 font-medium hover:text-green-400 inline-flex items-center">
                Learn More
                <ChevronRight className="w-4 h-4 ml-1" />
              </span>
            </div>
          </Link>

          <Link to="/players" className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:bg-gray-700 transition-colors">
            <img
              src="https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&q=80&w=2940"
              alt="Player Rankings"
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Player Rankings</h3>
              <p className="text-gray-400">Check out the top players and their stats this season.</p>
              <span className="mt-4 text-green-500 font-medium hover:text-green-400 inline-flex items-center">
                View Rankings
                <ChevronRight className="w-4 h-4 ml-1" />
              </span>
            </div>
          </Link>

          <Link to="/teams" className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:bg-gray-700 transition-colors">
            <img
              src="https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&q=80&w=2940"
              alt="Community"
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Join the Community</h3>
              <p className="text-gray-400">Connect with other players and build your team.</p>
              <span className="mt-4 text-green-500 font-medium hover:text-green-400 inline-flex items-center">
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Home;