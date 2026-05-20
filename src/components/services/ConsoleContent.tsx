import { LayoutDashboard, Search, FolderKanban } from 'lucide-react';

export default function ConsoleContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Cloud Console Management</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Our intuitive cloud console acts as the control plane for your entire digital infrastructure. It offers a sophisticated, real-time dashboard design to monitor, manage, and scale your resources with minimal cognitive friction.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Interface Highlights</h3>
        <div className="space-y-4">
           {['Advanced Search (Cmd+K)', 'Resource Grouping', 'Real-time Analytics', 'Project Switching'].map(feat => (
               <div key={feat} className="flex gap-3 border-b border-gray-100 py-3 text-sm">
                    <FolderKanban className="text-blue-500 h-5 w-5" />
                    <span>{feat}</span>
               </div>
           ))}
        </div>
      </section>
    </div>
  );
}
