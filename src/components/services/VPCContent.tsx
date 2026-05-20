import { Shield, Zap, Lock } from 'lucide-react';

export default function VPCContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Private VPC Networking</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo VPC (Virtual Private Cloud) allows you to build isolated, secure network environments for your infrastructure. By logically separating your resources, you gain granular control over traffic flow, security, and connectivity between your Droplets, Managed Databases, and Load Balancers.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Key Architecture Principles</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Our VPC implementation provides a private, layer-2 network boundary for your assets, ensuring that communication between your infrastructure components is not exposed to the public internet by default.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 p-6 flex flex-col items-center text-center">
            <Lock className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Isolation</h4>
            <p className="text-xs text-[#4a4a4a]">Complete network segmentation to keep sensitive data away from public threats.</p>
          </div>
          <div className="border border-gray-200 p-6 flex flex-col items-center text-center">
            <Zap className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">High Performance</h4>
            <p className="text-xs text-[#4a4a4a]">Low-latency, high-throughput communication between your internal resources.</p>
          </div>
          <div className="border border-gray-200 p-6 flex flex-col items-center text-center">
            <Shield className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Granular Security</h4>
            <p className="text-xs text-[#4a4a4a]">Control communication patterns using powerful platform firewalls tied to network segments.</p>
          </div>
        </div>
      </section>

      <div className="border border-gray-200 p-8">
        <h4 className="font-bold text-[#2e3d49] text-sm mb-6 uppercase tracking-widest">Enabling VPC</h4>
        <ol className="list-decimal pl-5 text-sm text-[#4a4a4a] space-y-4">
          <li>Navigate to the <span className="font-bold">Networking</span> tab in the portal.</li>
          <li>Select <span className="font-bold">VPC Networks</span> and then click <span className="font-bold">Create Network</span>.</li>
          <li>Define your IP range (CIDR) to suit your infrastructure requirements.</li>
          <li>Assign new or existing resources (Droplets, DBs) to your new VPC network.</li>
        </ol>
      </div>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Build Secure Networks</h4>
          <p className="text-sm text-[#4a4a4a]">Start designing your private network architecture today.</p>
        </div>
        <a href="/networking/vpc" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Shield className="h-4 w-4" /> Create VPC
        </a>
      </div>
    </div>
  );
}
