import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

function Schedule() {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Schedule</h1>
          <div className="flex items-center space-x-4">
            <button className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              <CalendarIcon className="w-5 h-5" />
            </button>
            <select className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              <option>All Games</option>
              <option>Regular Season</option>
              <option>Playoffs</option>
              <option>Championships</option>
            </select>
          </div>
        </div>

        <div className="space-y-8">
          {/* Date Section */}
          <div>
            <h2 className="text-green-500 font-semibold mb-4">Today - {format(new Date(), 'MMMM d, yyyy')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Game Card */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">7:00 PM ET</span>
                  <span className="text-sm text-green-500">Live</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <span className="text-white">NYC Dragons</span>
                  </div>
                  <span className="text-white font-semibold">86</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    <span className="text-white">LA Knights</span>
                  </div>
                  <span className="text-white font-semibold">92</span>
                </div>
              </div>
              {/* More game cards... */}
            </div>
          </div>

          {/* Upcoming Dates */}
          <div>
            <h2 className="text-green-500 font-semibold mb-4">Tomorrow - {format(new Date(Date.now() + 86400000), 'MMMM d, yyyy')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Game cards... */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Schedule;