import React from 'react';
import { Terminal, Code2, Cpu, Box } from 'lucide-react';

export default function DeveloperSection() {
  return (
    <section className="py-12 px-6 border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Built for Developers, by Developers</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto">
            Integrate Cloud Servers and ISP billing into your own applications with our robust REST API and CLI tools.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
           <div className="space-y-8">
              <div className="flex gap-4">
                 <div className="w-10 h-10 bg-gray-950 text-white rounded flex items-center justify-center shrink-0">
                    <Terminal className="h-5 w-5" />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Powerful CLI</h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">Manage instances, snapshots, and network firewall rules directly from your terminal.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center shrink-0">
                    <Code2 className="h-5 w-5 text-gray-900" />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Robust REST API</h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">Everything you can do in the dashboard is available via our API. Perfect for custom WHM flows.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center shrink-0">
                    <Box className="h-5 w-5 text-gray-900" />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">SDKs & Libraries</h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">First-class support for Node.js, Go, Python, and PHP to speed up your integration.</p>
                 </div>
              </div>
           </div>
           
           <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 shadow-sm">
              <div className="bg-white rounded p-4 border border-gray-100 font-mono text-[11px] text-gray-600 space-y-2">
                 <div className="flex items-center justify-between border-b border-gray-50 pb-2 mb-2">
                    <span className="font-bold text-blue-600">GET /v1/instances</span>
                    <span className="text-gray-400">200 OK</span>
                 </div>
                 <pre className="text-gray-700">
{`{
  "instances": [
    {
      "id": "node_9281",
      "status": "running",
      "os": "CloudLinux 9.4",
      "ip": "103.45.192.11",
      "region": "Singapore"
    }
  ]
}`}
                 </pre>
                 <div className="pt-2 border-t border-gray-50 text-emerald-600 font-bold">
                    $ tiwlo create instance --type c3.large --region sgp-1
                 </div>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}
