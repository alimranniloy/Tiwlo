import React from 'react';
import { Headset, Mail, MessageSquare } from 'lucide-react';

export default function SupportSection() {
  return (
    <section className="py-10 px-6 border-t border-gray-100 bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex gap-5">
             <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center shrink-0">
                <Headset className="h-5 w-5" />
             </div>
             <div>
                <h4 className="font-bold mb-1">Expert Support</h4>
                <p className="text-xs text-gray-400 font-medium">Talk to a real human architect 24/7/365.</p>
             </div>
          </div>
          <div className="flex gap-5">
             <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5" />
             </div>
             <div>
                <h4 className="font-bold mb-1">Live Chat</h4>
                <p className="text-xs text-gray-400 font-medium">Instant answers for technical deployment.</p>
             </div>
          </div>
          <div className="flex gap-5">
             <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
             </div>
             <div>
                <h4 className="font-bold mb-1">Email Tickets</h4>
                <p className="text-xs text-gray-400 font-medium">Priority handling for enterprise requests.</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
