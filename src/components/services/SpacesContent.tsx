import { Globe, HardDrive } from 'lucide-react';

export default function SpacesContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Object Storage (Spaces)</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo Spaces provide S3-compatible object storage designed for massive scalability, high durability, and rapid asset delivery. Whether you're hosting images, backups, or large media files, Spaces integrates seamlessly with your infrastructure and edge network.
      </p>
      
      <section className="space-y-6">
         <h3 className="text-xl font-bold text-[#2e3d49]">Performance Features</h3>
         <div className="p-6 bg-gray-50 border border-gray-200 space-y-3 font-mono text-sm">
             <div><span className="text-blue-600">✓</span> S3-Compatible API</div>
             <div><span className="text-blue-600">✓</span> Built-in CDN integration</div>
             <div><span className="text-blue-600">✓</span> CORS & Lifecycle policies</div>
             <div><span className="text-blue-600">✓</span> High-durability (99.999%+)</div>
         </div>
      </section>
    </div>
  );
}
