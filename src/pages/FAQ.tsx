import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I join a tournament?",
    answer: "To join a tournament, first create an account and complete your profile. Then, navigate to the Tournaments page, select an upcoming tournament, and click the 'Register' button. Follow the instructions to complete your registration and pay any entry fees if required."
  },
  {
    question: "What are the requirements to participate?",
    answer: "Participants must be at least 13 years old, have a valid NBA 2K account, and agree to follow our tournament rules and code of conduct. Some tournaments may have additional requirements, which will be clearly stated in the tournament details."
  },
  {
    question: "How are prizes distributed?",
    answer: "Prize distribution varies by tournament and will be clearly outlined in the tournament details. Generally, prizes are distributed within 14 days of tournament completion, after all results are verified and any disputes are resolved."
  },
  {
    question: "What happens if I experience technical issues during a match?",
    answer: "If you experience technical issues, immediately notify your opponent and a tournament administrator through the designated communication channels. Take screenshots or recordings of the issue if possible. Our admins will review the situation and make a ruling based on our technical issues policy."
  },
  {
    question: "How do I report unsportsmanlike behavior?",
    answer: "To report unsportsmanlike behavior, use the 'Report' button on the player's profile or match page. Provide as much detail as possible, including screenshots or recordings if available. Our moderation team will review the report and take appropriate action."
  },
  {
    question: "Can I stream my tournament matches?",
    answer: "Yes, you can stream your tournament matches unless specifically prohibited in the tournament rules. We encourage players to stream their games and share their content, but please be mindful of our content guidelines and any tournament-specific broadcasting rules."
  },
  {
    question: "How do team registrations work?",
    answer: "For team tournaments, the team captain must first create a team in their dashboard. They can then invite other players to join the team. Once the team roster is complete, the captain can register the team for tournaments. All team members must have verified accounts."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept major credit cards, PayPal, and other popular payment methods. The available payment options will be displayed during the registration process. All transactions are secure and processed through our trusted payment partners."
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