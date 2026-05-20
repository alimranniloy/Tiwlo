import { Activity, Bell, Monitor } from 'lucide-react';

export default function MonitoringContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Real-Time Monitoring & Alerts</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Infrastructure visibility is crucial. Tiwlo’s Monitoring & Alerting suite provides granular, real-time insights into the performance and health of your Droplets, Load Balancers, and Database clusters.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Core Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-6">
            <Activity className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Real-Time Metrics</h4>
            <p className="text-xs text-[#4a4a4a]">Visualize CPU utilization, memory pressure, disk I/O, and bandwidth usage with sub-minute resolution.</p>
          </div>
          <div className="border border-gray-200 p-6">
            <Bell className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Automated Alerting</h4>
            <p className="text-xs text-[#4a4a4a]">Define custom thresholds and receive instant notifications via email or Slack when system health degrades.</p>
          </div>
        </div>
      </section>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Stay Informed</h4>
          <p className="text-sm text-[#4a4a4a]">Configure alerts for your infrastructure.</p>
        </div>
        <a href="/monitoring/alerts" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Monitor className="h-4 w-4" /> Configure Alerts
        </a>
      </div>
    </div>
  );
}
