import { Cpu, BarChart3, Settings, AlertTriangle } from 'lucide-react';

export default function K8sContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Managed Kubernetes</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo Managed Kubernetes (TKE) streamlines the orchestration of your containerized applications. We manage the delicate control plane, patching, master-node availability, and auto-scaling, allowing your team to focus exclusively on deploying microservices efficiently.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Core Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-6">
            <BarChart3 className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Automated Auto-Scaling</h4>
            <p className="text-xs text-[#4a4a4a]">HPA (Horizontal Pod Autoscaler) dynamically adjusts the number of pod replicas based on CPU/RAM metrics, ensuring capacity meets demand automatically.</p>
          </div>
          <div className="border border-gray-200 p-6">
            <Settings className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Control Plane Maintenance</h4>
            <p className="text-xs text-[#4a4a4a]">We automatically handle Kubernetes version upgrades, security patches for etcd, and core component optimizations.</p>
          </div>
        </div>
      </section>

      <div className="bg-gray-50 border border-gray-200 p-8">
        <h4 className="font-bold text-[#2e3d49] text-sm mb-6 uppercase tracking-widest">Dashboard Snapshot</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
             <div className="p-4 bg-white border border-gray-200"><div className="text-2xl font-bold">128</div><div className="text-[10px] uppercase text-gray-500">Active Pods</div></div>
             <div className="p-4 bg-white border border-gray-200"><div className="text-2xl font-bold">14</div><div className="text-[10px] uppercase text-gray-500">Worker Nodes</div></div>
             <div className="p-4 bg-white border border-gray-200"><div className="text-2xl font-bold">99.9%</div><div className="text-[10px] uppercase text-gray-500">Availability</div></div>
        </div>
      </div>
    </div>
  );
}
