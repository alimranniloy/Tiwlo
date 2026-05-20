import { Database, ShieldCheck, Repeat } from 'lucide-react';

export default function DBContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Managed Database Clusters</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo Managed Databases provide fully managed, high-performance database clusters (PostgreSQL, MongoDB, and Redis) that allow you to focus on application logic, not infrastructure maintenance.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Managed Benefits</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Managing database clusters at scale—including security patching, automated backups, and ensuring high availability—is notoriously complex. Tiwlo simplifies this significantly.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-6 flex gap-4">
            <ShieldCheck className="h-10 w-10 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-[#2e3d49] text-sm mb-1">Security & Patching</h4>
              <p className="text-xs text-[#4a4a4a]">Automatic security updates and hardened configurations ensure your data is safe.</p>
            </div>
          </div>
          <div className="border border-gray-200 p-6 flex gap-4">
            <Repeat className="h-10 w-10 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-[#2e3d49] text-sm mb-1">Automated Backups</h4>
              <p className="text-xs text-[#4a4a4a]">Point-in-time recovery and daily automated snapshots for peace of mind.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border border-gray-200 p-8">
        <h4 className="font-bold text-[#2e3d49] text-sm mb-6 uppercase tracking-widest">Getting Started</h4>
        <ol className="list-decimal pl-5 text-sm text-[#4a4a4a] space-y-4">
          <li>Select your database engine (PostgreSQL, MongoDB, Redis).</li>
          <li>Choose your cluster configuration (nodes, RAM, CPU).</li>
          <li>Provision standby nodes for instant high-availability failover.</li>
          <li>Once provisioned, use the secure connection strings provided in the dashboard.</li>
        </ol>
      </div>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Deploy Databases</h4>
          <p className="text-sm text-[#4a4a4a]">Focus on code, we'll manage the engine.</p>
        </div>
        <a href="/databases/create" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Database className="h-4 w-4" /> Create Database
        </a>
      </div>
    </div>
  );
}
