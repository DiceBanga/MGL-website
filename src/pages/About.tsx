import React from 'react';

const About = () => {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">About Militia Gaming League</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2940"
              alt="Esports Tournament"
              className="rounded-lg shadow-xl"
            />
          </div>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-gray-300">
                Militia Gaming League (MGL) is dedicated to creating the most competitive and engaging NBA 2K esports experience. 
                We strive to build a community where players can showcase their skills, compete at the highest level, and connect 
                with fellow gaming enthusiasts.
              </p>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
              <p className="text-gray-300">
                We aim to become the premier destination for NBA 2K competitive gaming, fostering talent, and creating opportunities 
                for players to turn their passion into a professional career.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">Community First</h3>
            <p className="text-gray-300">
              We believe in building a strong, inclusive community where players can grow, learn, and compete together.
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">Fair Play</h3>
            <p className="text-gray-300">
              We maintain the highest standards of competitive integrity and ensure a level playing field for all participants.
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">Innovation</h3>
            <p className="text-gray-300">
              We continuously evolve our platform and tournaments to provide the best possible experience for our players.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Our Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-500">50+</div>
              <div className="text-gray-300 mt-2">Tournaments Hosted</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-500">10K+</div>
              <div className="text-gray-300 mt-2">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-500">$100K+</div>
              <div className="text-gray-300 mt-2">Prize Pool Awarded</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-500">20+</div>
              <div className="text-gray-300 mt-2">Partner Organizations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;