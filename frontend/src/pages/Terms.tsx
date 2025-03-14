import React from 'react';
import background from '../assets/images/background.webp';
import overlay from '../assets/images/overlay.svg';
import logo from '../assets/images/mgl-logo-2.png';

const Terms = () => {
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
      <div className="relative z-10 py-16 bg-gray-900 bg-opacity-80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
              <p className="text-gray-300">
                These terms and conditions outline the rules and regulations for the use of Militia Gaming League LLC's Website, https://militiagaming.gg/ and all sub domains.
              </p>
              <p className="text-gray-300 mt-4">
                The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and any or all Agreements: "Client", "You" and "Your" refers to you, the person accessing this website and accepting the Company's terms and conditions. "The company", "Ourselves", "We", "Our" and "Us", refers to our Company. "Party", "Parties", or "Us", refers to both the Client and ourselves, or either the Client or ourselves.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Agreement</h2>
              <p className="text-gray-300">
                By accessing this website we assume you accept these terms and conditions in full. Do not continue to use Militia Gaming League LLC's website if you do not accept all of the terms and conditions stated on this page.
              </p>
              <p className="text-gray-300 mt-4">
                By signing up or participating in any Militia Gaming League LLC season, tournament, promotion or any other Militia Gaming League LLC event (collectively, "Skill Competition" or "Skill Competitions"), you are accepting all terms of service, privacy policies, and all other rules and regulations herein.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Non-Refundable Policy</h2>
              <p className="text-gray-300">
                All payments made to Militia Gaming League LLC for any reason are on your own free will, and are non-refundable under any circumstances. This includes but is not limited to all team registration fees, team rebranding fees, roster transaction fees, transfer of ownership fees, donations, and player registration fees.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Legal Compliance</h2>
              <div className="space-y-4">
                <p className="text-gray-300">
                  You are subject to, and are solely responsible for, obeying all laws of the state, province, and/or country in which You reside and from which You access the Site, Log-In to the Site, or participate in any Skill Competition.
                </p>
                <h3 className="text-xl font-semibold text-white">Participation within the United States</h3>
                <p className="text-gray-300">
                  Participation in fee-based tournaments for prizes is prohibited in the following U.S. states, without limitation: Alaska, Arizona, Delaware, Maryland, Tennessee. VOID WHERE PROHIBITED OR RESTRICTED BY LAW.
                </p>
                <h3 className="text-xl font-semibold text-white">Participation outside the U.S.</h3>
                <p className="text-gray-300">
                  Participation in fee-based tournaments for prizes may be prohibited in Your jurisdiction, and it is Your sole responsibility to ensure compliance with such laws. VOID WHERE PROHIBITED OR RESTRICTED BY LAW.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Site Services</h2>
              <p className="text-gray-300">
                Militia Gaming League LLC offers the Site as a place for Users to arrange, record, and track Skill Competitions. We do not provide the Site or Services for gambling, or to otherwise participate in games of chance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Team Captain Responsibilities</h2>
              <p className="text-gray-300">
                Our obligations and agreement are to distribute prizes and communicate with the Team Captain only. If a team member is not the registered Team Captain, Militia Gaming League LLC has no obligation to communicate with that person.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Account Sharing</h2>
              <div className="space-y-4">
                <p className="text-gray-300">
                  All gamertags/PSNs on a team's roster must be valid and legitimately owned by the user on the roster. You may not share, buy, sell, rent, trade, or transfer to acquire any account on the roster.
                </p>
                <ul className="list-disc pl-6 text-gray-300">
                  <li>The actual owner of the account must play on it</li>
                  <li>Opponents are responsible for identifying violations before playing</li>
                  <li>Video proof is necessary for any disputes</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property</h2>
              <div className="space-y-4">
                <p className="text-gray-300">
                  When You submit any information, Content, feedback, or ratings, You grant us a non-exclusive, worldwide, perpetual, irrevocable, royalty-free, sub-licensable right to use such Submissions in any media known now or in the future.
                </p>
                <p className="text-gray-300">
                  By participating in any Militia Gaming League LLC event and posting related content, you expressly give Militia Gaming League LLC the right to use all of this material for any reason, including marketing and promotion, without compensation.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Disclaimer</h2>
              <p className="text-gray-300">
                To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Our Services are provided "AS-IS," "WITH ALL FAULTS" and "AS AVAILABLE."
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
              <p className="text-gray-300">
                For questions about these terms, contact us at:<br />
                admin@militiagaming.gg
              </p>
              <p className="text-gray-300 mt-4">
                Last updated: March 7, 2024
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;