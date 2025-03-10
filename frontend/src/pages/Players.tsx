import React from 'react';
import { User2, Trophy, Star, BarChart2 } from 'lucide-react';

const players = [
  {
    id: 1,
    name: "Michael Jordan",
    avatar: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2940",
    team: "NYC Dragons",
    position: "SG",
    rating: 99,
    ppg: 28.5,
    apg: 6.4,
    rpg: 5.8
  },
  {
    id: 2,
    name: "LeBron James",
    avatar: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2940",
    team: "LA Knights",
    position: "SF",
    rating: 98,
    ppg: 25.7,
    apg: 8.2,
    rpg: 7.9
  }
];

function Players() {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Players</h1>
          <div className="flex space-x-4">
            <select className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              <option>All Players</option>
              <option>Top Rated</option>
              <option>Free Agents</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {players.map((player) => (
            <div key={player.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="relative h-48">
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  {player.rating} OVR
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{player.name}</h3>
                    <p className="text-gray-400">{player.team} • {player.position}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{player.ppg}</p>
                    <p className="text-sm text-gray-400">PPG</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{player.apg}</p>
                    <p className="text-sm text-gray-400">APG</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{player.rpg}</p>
                    <p className="text-sm text-gray-400">RPG</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center">
                    <BarChart2 className="w-4 h-4 mr-2" />
                    View Stats
                  </button>
                  <button className="text-green-500 hover:text-green-400 flex items-center">
                    <Trophy className="w-4 h-4 mr-2" />
                    Achievements
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Players;