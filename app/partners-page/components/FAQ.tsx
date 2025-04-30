'use client';

const faqs = [
  {
    question: "How does the partner program work?",
    answer: "Our partner program allows you to earn commissions by referring detailers to Renu. When a detailer you refer joins and remains active on our platform, you earn a percentage of their subscription fees."
  },
  {
    question: "What are the commission rates?",
    answer: "Partners can earn up to 20% recurring commission on referred detailers' subscription fees. The exact rate depends on the number of active referrals and their subscription tiers."
  },
  {
    question: "How do I track my referrals and earnings?",
    answer: "You'll have access to a dedicated partner dashboard where you can track your referrals, view commission earnings, and monitor your performance in real-time."
  },
  {
    question: "What support do partners receive?",
    answer: "Partners receive dedicated support from our partnership team, access to marketing materials, training resources, and regular updates about new features and opportunities."
  },
  {
    question: "How often are commissions paid?",
    answer: "Commissions are paid monthly for all qualifying referrals from the previous month, provided you've reached the minimum payout threshold."
  }
];

export default function FAQ() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
        
        <div className="space-y-8">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-8">
              <h3 className="text-xl font-semibold mb-4">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-xl mb-8">Still have questions?</p>
          <a 
            href="mailto:reevacar@gmail.com"
            className="bg-[#0A2217] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-[#0A2217]/90 transition-colors inline-block"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
} 