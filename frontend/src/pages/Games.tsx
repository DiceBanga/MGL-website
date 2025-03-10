import React from 'react';
import { supabase } from '../lib/supabase';

function Games() {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Games</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Game cards will be populated here */}
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2940"
              alt="NBA 2K24"
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2">NBA 2K24</h3>
              <p className="text-gray-400 mb-4">
                Experience the latest iteration of NBA 2K with improved gameplay mechanics and stunning graphics.
              </p>
              <button className="text-green-500 font-medium hover:text-green-400">
                View Details →
              </button>
            </div>
          </div>

          {/* More game cards... */}
        </div>
      </div>
    </div>
  );
}

export default Games;