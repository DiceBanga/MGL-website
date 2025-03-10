import React from 'react';

const Terms = () => {
  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300">
              By accessing and using the Militia Gaming League platform, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">2. Eligibility</h2>
            <p className="text-gray-300">
              You must be at least 13 years old to use our services. If you are under 18, you must have parental consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
            <p className="text-gray-300">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-2">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">4. Tournament Rules</h2>
            <p className="text-gray-300">
              Participants must:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-2">
              <li>Follow all tournament rules and guidelines</li>
              <li>Maintain good sportsmanship</li>
              <li>Report any violations or technical issues</li>
              <li>Accept all final decisions by tournament administrators</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">5. Prohibited Conduct</h2>
            <p className="text-gray-300">
              Users may not:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-2">
              <li>Cheat or use unauthorized modifications</li>
              <li>Harass or abuse other users</li>
              <li>Exploit bugs or glitches</li>
              <li>Share account credentials</li>
              <li>Engage in any illegal activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">6. Payment Terms</h2>
            <p className="text-gray-300">
              All tournament entry fees and purchases are:
            </p>
            <ul className="list-disc pl-6 text-gray-300 mt-2">
              <li>Non-refundable unless otherwise stated</li>
              <li>Subject to our refund policy</li>
              <li>Processed through secure payment methods</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
            <p className="text-gray-300">
              All content on the platform is owned by Militia Gaming League and protected by copyright laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">8. Termination</h2>
            <p className="text-gray-300">
              We reserve the right to terminate or suspend accounts for violations of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">9. Disclaimer</h2>
            <p className="text-gray-300">
              The platform is provided "as is" without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
            <p className="text-gray-300">
              For questions about these terms, contact us at:<br />
              legal@militagamingleague.com
            </p>
            <p className="text-gray-300 mt-4">
              Last updated: February 21, 2024
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;