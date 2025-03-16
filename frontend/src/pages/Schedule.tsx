import React, { useState, useEffect } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Game {
  id: string;
  home_team: { name: string };
  away_team: { name: string };
  home_score?: number;
  away_score?: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduled_at: string;
}

interface RawGameResponse {
  id: string;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduled_at: string;
}

interface GamesByDate {
  [date: string]: Game[];
}

function Schedule() {
  const [games, setGames] = useState<GamesByDate>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      
      // Get games for the next 7 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: rawData, error } = await supabase
        .from('games')
        .select(`
          id,
          home_team:home_team_id(name),
          away_team:away_team_id(name),
          home_score,
          away_score,
          status,
          scheduled_at
        `)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', nextWeek.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match the Game interface
      const transformedGames: Game[] = (rawData || []).map(game => {
        const rawGame = game as unknown as RawGameResponse;
        return {
          id: rawGame.id,
          home_team: { name: rawGame.home_team?.name || 'TBD' },
          away_team: { name: rawGame.away_team?.name || 'TBD' },
          home_score: rawGame.home_score || undefined,
          away_score: rawGame.away_score || undefined,
          status: rawGame.status,
          scheduled_at: rawGame.scheduled_at
        };
      });
      
      // Group games by date
      const gamesByDate: GamesByDate = {};
      
      transformedGames.forEach(game => {
        const date = game.scheduled_at.split('T')[0]; // Get YYYY-MM-DD
        if (!gamesByDate[date]) {
          gamesByDate[date] = [];
        }
        gamesByDate[date].push(game);
      });
      
      setGames(gamesByDate);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York'
    }) + ' ET';
  };

  const formatDateHeading = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = addDays(today, 1);
    
    if (date.getTime() === today.getTime()) {
      return `Today - ${format(date, 'MMMM d, yyyy')}`;
    } else if (date.getTime() === tomorrow.getTime()) {
      return `Tomorrow - ${format(date, 'MMMM d, yyyy')}`;
    } else {
      return format(date, 'EEEE - MMMM d, yyyy');
    }
  };

  const filteredGames = () => {
    if (filter === 'all') return games;
    
    const filtered: GamesByDate = {};
    
    Object.keys(games).forEach(date => {
      const gamesOnDate = games[date].filter(game => {
        if (filter === 'live') return game.status === 'live';
        if (filter === 'scheduled') return game.status === 'scheduled';
        if (filter === 'completed') return game.status === 'completed';
        return true;
      });
      
      if (gamesOnDate.length > 0) {
        filtered[date] = gamesOnDate;
      }
    });
    
    return filtered;
  };

  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Schedule</h1>
          <div className="flex items-center space-x-4">
            <button 
              className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              aria-label="View Calendar"
              title="View Calendar"
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                aria-haspopup="listbox"
              >
                {filter === 'all' ? 'All Games' : 
                 filter === 'live' ? 'Live Games' : 
                 filter === 'scheduled' ? 'Upcoming Games' : 'Completed Games'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10">
                  <ul className="py-1">
                    <li>
                      <button
                        className={`block px-4 py-2 text-sm w-full text-left ${filter === 'all' ? 'text-green-500' : 'text-white hover:bg-gray-700'}`}
                        onClick={() => {
                          setFilter('all');
                          setShowFilterDropdown(false);
                        }}
                      >
                        All Games
                      </button>
                    </li>
                    <li>
                      <button
                        className={`block px-4 py-2 text-sm w-full text-left ${filter === 'live' ? 'text-green-500' : 'text-white hover:bg-gray-700'}`}
                        onClick={() => {
                          setFilter('live');
                          setShowFilterDropdown(false);
                        }}
                      >
                        Live Games
                      </button>
                    </li>
                    <li>
                      <button
                        className={`block px-4 py-2 text-sm w-full text-left ${filter === 'scheduled' ? 'text-green-500' : 'text-white hover:bg-gray-700'}`}
                        onClick={() => {
                          setFilter('scheduled');
                          setShowFilterDropdown(false);
                        }}
                      >
                        Upcoming Games
                      </button>
                    </li>
                    <li>
                      <button
                        className={`block px-4 py-2 text-sm w-full text-left ${filter === 'completed' ? 'text-green-500' : 'text-white hover:bg-gray-700'}`}
                        onClick={() => {
                          setFilter('completed');
                          setShowFilterDropdown(false);
                        }}
                      >
                        Completed Games
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : Object.keys(filteredGames()).length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400 text-lg">No games found matching your filter.</p>
            </div>
          ) : (
            Object.keys(filteredGames()).sort().map(date => (
              <div key={date}>
                <h2 className="text-green-500 font-semibold mb-4">{formatDateHeading(date)}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGames()[date].map((game) => (
                    <div 
                      key={game.id} 
                      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm ${
                          game.status === 'live' ? 'text-red-500' : 
                          game.status === 'completed' ? 'text-gray-400' : 
                          'text-green-500'
                        } font-medium`}>
                          {game.status === 'scheduled' ? formatGameTime(game.scheduled_at) : game.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-white">{game.home_team.name}</span>
                          {(game.status === 'live' || game.status === 'completed') && (
                            <span className={`text-white font-semibold ${
                              (game.home_score ?? 0) > (game.away_score ?? 0) ? 'text-green-500' : ''
                            }`}>
                              {game.home_score}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white">{game.away_team.name}</span>
                          {(game.status === 'live' || game.status === 'completed') && (
                            <span className={`text-white font-semibold ${
                              (game.away_score ?? 0) > (game.home_score ?? 0) ? 'text-green-500' : ''
                            }`}>
                              {game.away_score}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedule;