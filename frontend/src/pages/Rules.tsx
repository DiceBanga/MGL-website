import React from 'react';

const Rules = () => {
  return (
    <div className="bg-gray-900 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">League Rules</h1>
        
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">General Rules</h2>
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-medium text-white">1. Team Requirements</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>Teams must have a minimum of 5 players and a maximum of 7 players on their roster.</li>
                <li>All players must be at least 13 years of age.</li>
                <li>Teams must designate a team captain who will be responsible for all team communications.</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6">2. Match Rules</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>All matches will be played in a Best of 3 (Bo3) format unless otherwise specified.</li>
                <li>Teams must be ready to play at their scheduled match time.</li>
                <li>A 10-minute grace period will be given before a forfeit is declared.</li>
                <li>Each team is allowed one 5-minute tactical timeout per map.</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6">3. Sportsmanship</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>Players must maintain professional conduct during all league activities.</li>
                <li>Harassment or discriminatory behavior of any kind will not be tolerated.</li>
                <li>Teams must play to the best of their abilities at all times.</li>
                <li>Match fixing or intentionally throwing games is strictly prohibited.</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6">4. Technical Requirements</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>All players must use the official league client/game version.</li>
                <li>Players are responsible for their own internet connection.</li>
                <li>Recording software may be required for specific tournaments.</li>
                <li>Players must be able to join the official league Discord server.</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6">5. Penalties</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>Rule violations may result in warnings, point deductions, or disqualification.</li>
                <li>Repeated violations may result in season-long bans.</li>
                <li>All admin decisions are final.</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Tournament Rules</h2>
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-medium text-white">1. Registration</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>Teams must complete registration and payment before the deadline.</li>
                <li>Roster changes are not allowed after registration closes.</li>
                <li>Teams must check in 30 minutes before their first match.</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6">2. Format</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>Double elimination bracket unless otherwise specified.</li>
                <li>Winners bracket matches are Best of 3 (Bo3).</li>
                <li>Grand Finals are Best of 5 (Bo5).</li>
                <li>Map selection process will be communicated before the tournament.</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6">3. Prizes</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-2">
                <li>Prize distribution will be announced before each tournament.</li>
                <li>Prizes will be paid out within 30 days of tournament completion.</li>
                <li>Teams must provide valid payment information to receive prizes.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Additional Information</h2>
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-300">
                For complete rules and regulations, please visit the{' '}
                <a
                  href="https://unifiedproam.gg/rules/#section10"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-400"
                >
                  official rulebook
                </a>
                . Rules are subject to change. Teams will be notified of any rule changes via email and Discord.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Rules; 