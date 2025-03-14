import React from 'react';
import background from '../assets/images/background.webp';
import overlay from '../assets/images/overlay.svg';
import logo from '../assets/images/mgl-logo-2.png';

const Rules = () => {
  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img 
          src={background} 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        <img 
          src={overlay} 
          alt="Overlay" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Header with Logo */}
      <div className="relative z-10 w-full bg-gray-900 bg-opacity-80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <img 
            src={logo} 
            alt="MGL Logo" 
            className="h-16 w-auto"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 py-12 bg-gray-900 bg-opacity-80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-8">League Rules</h1>
          
          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">General Player Conduct</h2>
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>By participating in any MGL event you are agreeing to not defame MGL or its leagues on any form of social media, news outlet or otherwise. We will respond to concerns in DM's, the ticket support system, or email NOT public social media.</li>
                  <li>By participating in MGL you agree to not harass players for any reason including but not limited to race, color, national origin, religion, sex, gender identity, age, disability, or sexual orientation.</li>
                  <li>By participating in any MGL event you agree to not harass the administration team and to treat them with respect. Treating the administration team disrespectfully may result in a forfeit, brand strike, fine or ban. Our staff always has the intent to do the right thing and assist however they can. In the end, some rulings may just not be in your favor. It is never personal.</li>
                  <li>All infractions against the Terms of Service or this rules page will result in a strike against the captain and/or player involved over the course of their lifetime participation in a MGL event. Three strikes will result in a suspension or ban from the league at the discretion of the Admin Team. A brand, captain or player must play a full season without a strike to get a strike removed from their lifetime participation. MGL reserves the right to revise any punishment as it sees fit on a case by case basis.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Account Eligibility Rules</h2>
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>All infractions related to abuse of Take Two (2K) terms of service should be reported directly to 2K not to MGL. (i.e. account sharing/buying, badge grinding, etc.). MGL is unable to determine if 2K terms of service have been violated. MGL will only respond to related complaints should the user be gaining a perceived unfair competitive advantage in its league.</li>
                  <li>All in-game usernames (PlayStation ID or XBox Live Gamertag) must be registered to each team's roster in order to compete. Failure to follow this requirement will result in forfeit. Multiple occurrences will result in the team's removal from the event without a refund.</li>
                  <li>If using multiple 2K accounts, you must change and register the in-game username (PlayStation ID or XBox Live Gamertag) of each account to closely resemble (one character difference at the end) the name you are commonly known as in the MGL community. Example: deluxpike may compete as deluxpike_ but deluxpike may not compete as EvThatGuy-</li>
                  <li>MGL will only respond to stat correction requests if the in-game username matches the registered MGL username exactly.</li>
                  <li>If a team begins a game knowing that their opponent is in violation of any league rule, they are automatically accepting the results of that game.</li>
                  <li>Proof must be provided to support any claims of an ineligible player playing in a game. The proof must be clear to read/hear and not edited, cropped or otherwise tampered with.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Registration & Team Information</h2>
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>Any team that plays in this league must have passed team registration and paid the league Registration Fee, when applicable.</li>
                  <li>All registration fees for any Militia Gaming League event are non-refundable unless that event has been canceled by the organization. In the instance that an event is canceled, refunds will be issued in the form of MGL Wallet credits unless otherwise specified by management.</li>
                  <li>Each team will have 10 roster spots available at registration. There will be an Additional Player Fee associated with any player added after registration whether you've reached 10 roster spots or not. At registration players are required to have a primary position but can use any position as long as that player is on the roster.</li>
                  <li>Each player may only play on one team at a time. You may not play on multiple teams with multiple accounts.</li>
                  <li>If an issue arises where the team owner/captain no longer wishes to be a captain they can transfer team ownership to another player by letting league admin know and paying a Transfer of Ownership Fee.</li>
                  <li>You must play on the court with your registered team name and logos to get credit for wins. Every team name must have "MGL" before or after the name.</li>
                  <li>Teams can only play league/tournament games with players that are on their roster.</li>
                  <li>All internal team changes must be processed through MGL.</li>
                  <li>During the postseason, each team is allowed only one emergency roster change for the entire playoff run.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Court/Jersey/Logo Design</h2>
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>Home jerseys must be predominantly white or light gray. Away jerseys can be any color except white or light gray.</li>
                  <li>Every team court must have a MGL logo on it. You find it by searching "MilitiaGaming" on PS5/XBOX S/X on the current NBA 2K.</li>
                  <li>Courts must be all wood, color is allowed in the paint and apron.</li>
                  <li>Any logo not imported from the "MilitiaGaming" account is invalid.</li>
                  <li>Admin Team reserves the right to request alterations to your court for any reason.</li>
                  <li>We DO NOT allow NBA or College team logos! Your team logo must be owned by you or a teammate.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Gameplay Rules</h2>
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <p className="text-gray-300">The Competition Committee is a council of volunteer MGL players which discuss and debate necessary rules to ensure fair and competitive play in the community. No member of the Competition Committee is on MGL staff.</p>
                
                <h3 className="text-xl font-medium text-white mt-6">Current Rules:</h3>
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>The use of N/A Free Throws is prohibited - ensure "Free Throw Timing" is set to "User".</li>
                  <li>Utilizing between the legs "dribble exploit" 3 or more times consecutively with any Moving Crossover Signature Style will be considered a violation.</li>
                  <li>If a team begins a game knowing the opponent is in violation of any league rule, that team is automatically accepting the results of that game.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Season Schedules & Tournaments</h2>
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-medium text-white">Regular Season</h3>
                <p className="text-gray-300">Schedules will be dependent upon the event in which you signed up for. Please refer to the signup page for schedule details and format.</p>

                <h3 className="text-xl font-medium text-white mt-6">Playoffs & Seeding</h3>
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>Seeding is determined by utilizing a formula including legacy leaderboard points, performance in pre & mid season tournaments, regular season win percentage, strength of schedule, and total regular season games played.</li>
                  <li>The top 4 teams in total games played will be guaranteed a playoff spot.</li>
                  <li>Any team which has 3 or more active Pro Members will be guaranteed a playoff spot.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Subscriptions</h2>
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <p className="text-gray-300">Memberships are offered as an optional premium service to enhance your experience within the leagues in Militia Gaming League and this website. Each membership has its benefits and features which are included in them.</p>
                
                <h3 className="text-xl font-medium text-white mt-6">Subscription Fees</h3>
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>The subscriber's payment method is automatically charged on the same date as the original transaction date each month.</li>
                  <li>Discounts, rebates, or other special offers only valid for the initial term.</li>
                  <li>MGL may terminate the subscription if unable to renew based on inaccurate or outdated credit card information.</li>
                </ul>

                <h3 className="text-xl font-medium text-white mt-6">Cancellation & Refunds</h3>
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>You can cancel your subscription from your account profile page.</li>
                  <li>Your membership will continue through the end of your current charge cycle.</li>
                  <li>Subscription fees are non-refundable.</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules; 