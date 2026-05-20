import { Zap, GitBranch, TerminalSquare } from 'lucide-react';

export default function FunctionsContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Serverless Functions</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Deploy your code and let Tiwlo handle the execution infrastructure. Our Serverless Functions platform enables event-driven architectures that scale instantly from zero to thousands of concurrent requests, without managing any underlying servers.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-6 flex gap-4">
             <GitBranch className="h-8 w-8 text-blue-600 shrink-0"/>
             <div>
                <h4 className="font-bold text-[#2e3d49] text-sm mb-1">Event-Driven</h4>
                <p className="text-xs text-[#4a4a4a]">Trigger functions via HTTP API, object storage uploads, or scheduled Cron jobs.</p>
             </div>
          </div>
          <div className="border border-gray-200 p-6 flex gap-4">
             <TerminalSquare className="h-8 w-8 text-blue-600 shrink-0"/>
             <div>
                <h4 className="font-bold text-[#2e3d49] text-sm mb-1">Runtime Flexibility</h4>
                <p className="text-xs text-[#4a4a4a]">Support for Node.js, Python, Go, and PHP, offering freedom in development stacks.</p>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
