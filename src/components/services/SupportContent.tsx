import { HelpCircle, MessageCircle, FileText } from 'lucide-react';

export default function SupportContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Technical Support</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Our committed support team is here to ensure your infrastructure runs smoothly. From onboarding assistance to complex architectural troubleshooting, we're with you around the clock.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Support Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-6">
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Community & Documentation</h4>
            <p className="text-xs text-[#4a4a4a]">Access our extensive library of guides, forums, and tutorials free for all users.</p>
          </div>
          <div className="border border-gray-200 p-6">
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Dedicated Enterprise Support</h4>
            <p className="text-xs text-[#4a4a4a]">For enterprise customers, we offer rapid response, 24/7 ticket support, and dedicated account management.</p>
          </div>
        </div>
      </section>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Need Help?</h4>
          <p className="text-sm text-[#4a4a4a]">Open a new ticket or explore the documentation.</p>
        </div>
        <a href="/support" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <MessageCircle className="h-4 w-4" /> Contact Support
        </a>
      </div>
    </div>
  );
}
