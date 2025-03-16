import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DbGame } from '../types/database';

// Define a type for the raw response from Supabase
interface GameResponse {
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

function Games() {
  const [games, setGames] = useState<DbGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
        .order('scheduled_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      // Transform the data to match the DbGame interface
      const transformedGames: DbGame[] = (data as GameResponse[] || []).map(game => {
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
            name: game.home_team[0]?.name || 'TBD',
            logo_url: game.home_team[0]?.logo_url
          },
          away_team: { 
            name: game.away_team[0]?.name || 'TBD',
            logo_url: game.away_team[0]?.logo_url
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

  const formatGameDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Games</h1>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.length > 0 ? (
              games.map(game => (
                <div key={game.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-sm px-2 py-1 rounded ${
                        game.status === 'live' ? 'bg-red-500/20 text-red-500' : 
                        game.status === 'completed' ? 'bg-gray-500/20 text-gray-400' : 
                        'bg-green-500/20 text-green-500'
                      } font-medium`}>
                        {game.status.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {formatGameDate(game.scheduled_at)}
                      </span>
                    </div>
                    
                    <div className="space-y-4 mb-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          {game.home_team?.logo_url ? (
                            <img 
                              src={game.home_team.logo_url} 
                              alt={`${game.home_team.name} logo`}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                          )}
                          <span className="text-white font-medium">{game.home_team?.name}</span>
                        </div>
                        {(game.status === 'live' || game.status === 'completed') && (
                          <span className={`text-white text-xl font-bold ${
                            (game.home_score ?? 0) > (game.away_score ?? 0) ? 'text-green-500' : ''
                          }`}>
                            {game.home_score}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          {game.away_team?.logo_url ? (
                            <img 
                              src={game.away_team.logo_url} 
                              alt={`${game.away_team.name} logo`}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                          )}
                          <span className="text-white font-medium">{game.away_team?.name}</span>
                        </div>
                        {(game.status === 'live' || game.status === 'completed') && (
                          <span className={`text-white text-xl font-bold ${
                            (game.away_score ?? 0) > (game.home_score ?? 0) ? 'text-green-500' : ''
                          }`}>
                            {game.away_score}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {game.status === 'scheduled' && (
                      <div className="text-center text-gray-400 text-sm mb-4">
                        {formatGameTime(game.scheduled_at)}
                      </div>
                    )}
                    
                    <button 
                      className="w-full text-center py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                      aria-label={`View details for ${game.home_team?.name} vs ${game.away_team?.name}`}
                      title={`View details for ${game.home_team?.name} vs ${game.away_team?.name}`}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white col-span-3 text-center">No games available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Games;