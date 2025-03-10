import React from 'react';
import { Users, Trophy, Star, ChevronRight } from 'lucide-react';

const teams = [
  {
    id: 1,
    name: "NYC Dragons",
    logo: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2940",
    ranking: 1,
    wins: 28,
    losses: 4,
    tournaments: 5
  },
  {
    id: 2,
    name: "LA Knights",
    logo: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2940",
    ranking: 2,
    wins: 26,
    losses: 6,
    tournaments: 5
  }
];

function Teams() {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Teams</h1>
          <div className="flex space-x-4">
            <select className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              <option>All Teams</option>
              <option>Active</option>
              <option>Top Ranked</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teams.map((team) => (
            <div key={team.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="relative h-48">
                <img
                  src={team.logo}
                  alt={team.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Rank #{team.ranking}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">{team.name}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-300 text-sm">Active Roster</span>
                  </div>
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-300 text-sm">{team.tournaments} Tournaments</span>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-300 text-sm">
                      Record: <span className="text-white">{team.wins}W - {team.losses}L</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
                    View Roster
                  </button>
                  <button className="text-green-500 hover:text-green-400 flex items-center">
                    Team Stats
                    <ChevronRight className="w-4 h-4 ml-1" />
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

export default Teams;