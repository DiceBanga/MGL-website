import React from 'react';
import { Trophy, Calendar, Users, ChevronRight } from 'lucide-react';

const tournaments = [
  {
    id: 1,
    name: "Season 6 Championship Series",
    description: "The biggest NBA 2K tournament of the year",
    startDate: "2024-03-01",
    endDate: "2024-04-15",
    prizePool: "$50,000",
    teamCount: 32,
    status: "registration",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2940"
  },
  {
    id: 2,
    name: "Spring Invitational",
    description: "Elite teams compete for glory",
    startDate: "2024-04-20",
    endDate: "2024-05-05",
    prizePool: "$25,000",
    teamCount: 16,
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2940"
  }
];

function Tournaments() {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Tournaments</h1>
          <div className="flex space-x-4">
            <select className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              <option>All Tournaments</option>
              <option>Active</option>
              <option>Upcoming</option>
              <option>Past</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="relative h-48">
                <img
                  src={tournament.image}
                  alt={tournament.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                  {tournament.status === 'registration' ? 'Registration Open' : 'Upcoming'}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{tournament.name}</h3>
                <p className="text-gray-400 mb-4">{tournament.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-300 text-sm">
                      {tournament.startDate} - {tournament.endDate}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-300 text-sm">{tournament.prizePool}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-300 text-sm">{tournament.teamCount} Teams</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
                    Register Now
                  </button>
                  <button className="text-green-500 hover:text-green-400 flex items-center">
                    View Details
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

export default Tournaments;