import { Layers, Activity, Settings } from 'lucide-react';

export default function LBContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">High Availability Load Balancers</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo Load Balancers automatically distribute traffic across multiple Droplet instances, ensuring your applications remain responsive and resilient during high traffic volumes or hardware failures.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Why Load Balancing Matters</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Without a load balancer, your application depends on a single point of failure. If your server goes down, your app is unreachable. Our Load Balancer acts as a traffic police, monitoring server health and routing traffic only to healthy instances.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-6">
            <Activity className="h-6 w-6 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Automated Health Checks</h4>
            <p className="text-xs text-[#4a4a4a]">Continuous monitoring ensures traffic is only routed to responsive server instances.</p>
          </div>
          <div className="border border-gray-200 p-6">
            <Settings className="h-6 w-6 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Scalable Traffic Routing</h4>
            <p className="text-xs text-[#4a4a4a]">Effortlessly scale up by adding more Droplets to the load balancer pool without downtime.</p>
          </div>
        </div>
      </section>

      <div className="border border-gray-200 p-8">
        <h4 className="font-bold text-[#2e3d49] text-sm mb-6 uppercase tracking-widest">Configuration Best Practices</h4>
        <ul className="list-disc pl-5 text-sm text-[#4a4a4a] space-y-4">
          <li><strong>Health Check Paths:</strong> Define simple <code>/health</code> endpoints in your app to give the load balancer highly accurate data.</li>
          <li><strong>SSL Termination:</strong> Offload SSL processing from your application servers to the load balancer to reduce CPU load.</li>
          <li><strong>Sticky Sessions:</strong> Enable session persistence for applications requiring consistent user affinity.</li>
        </ul>
      </div>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Optimize Traffic</h4>
          <p className="text-sm text-[#4a4a4a]">Deploy a managed Load Balancer and improve uptime.</p>
        </div>
        <a href="/networking/load-balancers" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Layers className="h-4 w-4" /> Create Load Balancer
        </a>
      </div>
    </div>
  );
}
