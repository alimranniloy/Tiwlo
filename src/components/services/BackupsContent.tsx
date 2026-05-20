import { Server, RefreshCw, Archive, Clock } from 'lucide-react';

export default function BackupsContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Backups & Recovery</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Infrastructure failure and data corruption are inevitable realities. Tiwlo’s automated backup system is designed to provide you with a robust safety net, ensuring you can restore your services rapidly.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Key Backup Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-6">
            <Archive className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Automated Weekly Backups</h4>
            <p className="text-xs text-[#4a4a4a]">Enable automatic, scheduled backups for your Droplets to ensure you always have a known good state.</p>
          </div>
          <div className="border border-gray-200 p-6">
            <RefreshCw className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Rapid Restoration</h4>
            <p className="text-xs text-[#4a4a4a]">Restore your Droplet state instantly from any of your scheduled backups if a deployment goes wrong.</p>
          </div>
        </div>
      </section>

      <div className="border border-gray-200 p-8">
        <h4 className="font-bold text-[#2e3d49] text-sm mb-6 uppercase tracking-widest">Disaster Recovery Strategy</h4>
        <ul className="list-disc pl-5 text-sm text-[#4a4a4a] space-y-4">
          <li><strong>Immutable Backups:</strong> Store your backups in an immutable format to prevent ransomware from affecting your recovery points.</li>
          <li><strong>Cross-Region Redundancy:</strong> For enterprise workloads, configure snapshot replication to different data center regions.</li>
          <li><strong>Periodic Testing:</strong> Regularly test your restoration process. A backup is only as good as its tested recovery.</li>
        </ul>
      </div>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Protect Data</h4>
          <p className="text-sm text-[#4a4a4a]">Enable automated backups today.</p>
        </div>
        <a href="/droplets/backups" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Clock className="h-4 w-4" /> Toggle Backups
        </a>
      </div>
    </div>
  );
}
