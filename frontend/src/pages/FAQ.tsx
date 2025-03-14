import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is Militia Gaming League?",
    answer: "Militia Gaming League (MGL) is an esports organization specializing in competitive NBA 2K tournaments. We host both live and online events, bringing together top players, esports organizations, and 2K professionals."
  },
  {
    question: "What platforms do MGL events take place on?",
    answer: "All MGL events are held on NBA 2K25 for PS5 and Xbox Series S|X. Please ensure you are playing on the latest version of the game to participate."
  },
  {
    question: "What modes do MGL events take place on?",
    answer: "Most MGL competitions are held in 5v5 Pro-Am Private matchmaking, though we occasionally host events using 3v3 Pro-Am Private matchmaking."
  },
  {
    question: "How do I register for a MGL event or tournament?",
    answer: "You can register for events by visiting our website at militiagaming.gg/registration. Look for the specific event or tournament you're interested in and follow the registration instructions."
  },
  {
    question: "What are the rules for MGL tournaments?",
    answer: "Comprehensive rules and regulations for MGL events can be found on our Rules page. Please review the rules carefully before participating."
  },
  {
    question: "What is the format of MGL tournaments and seasons?",
    answer: "MGL offers both tournaments and seasons. Seasons include a preseason tournament, a 2-week regular season, followed by playoffs. Tournaments come in various formats, including group stages, single elimination, and double elimination, depending on the specific event."
  },
  {
    question: "What are the requirements for team names and branding?",
    answer: "All teams participating in MGL events must have their own custom branding. Teams are not permitted to use NBA, collegiate branding, logos, or any trademarked names owned by other entities. Additionally, teams must include 'MGL' before or after their team names, and the MGL logo must be visible on their courts."
  },
  {
    question: "How can I make a roster or player name change?",
    answer: "Roster changes or player name updates can be made by visiting militiagaming.gg/shop."
  },
  {
    question: "Where can I view league results and standings?",
    answer: "You can view league results and standings on MGL's league platform hosted on League OS by visiting militiagaming.leagueos.gg."
  },
  {
    question: "What is the MGL Discord server?",
    answer: "To join the MGL Discord server, please use this link: discord.gg/SSSC74rSz8."
  },
  {
    question: "What should I do if a team is unavailable or refusing to play a scheduled game?",
    answer: "If a team is unavailable or refusing to play, document your attempts to arrange the game and submit the evidence to the MGL Admin team for review. If reviewed successfully, the available team will be awarded the win."
  },
  {
    question: "Can I watch MGL tournaments online?",
    answer: "Yes, MGL tournaments are streamed on Twitch and on YouTube."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-300">
            Find answers to common questions about Militia Gaming League.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 flex justify-between items-center text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-lg font-medium text-white">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-green-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-green-500" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-300">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;