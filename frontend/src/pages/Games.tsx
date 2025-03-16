import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DbItem } from '../types/database';

interface Game {
  id: string;
  item_name: string;
  item_description: string | null;
  image_url: string | null;
}

function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('item_type', 'game')
        .order('item_name');

      if (error) throw error;

      setGames((data || []) as Game[]);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Games</h1>
        
        {loading ? (
          <p className="text-white">Loading games...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.length > 0 ? (
              games.map(game => (
                <div key={game.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={game.image_url || "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2940"}
                    alt={game.item_name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-2">{game.item_name}</h3>
                    <p className="text-gray-400 mb-4">
                      {game.item_description || "No description available."}
                    </p>
                    <button 
                      className="text-green-500 font-medium hover:text-green-400"
                      aria-label={`View details for ${game.item_name}`}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white col-span-3">No games available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Games;