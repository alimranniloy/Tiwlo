export default function DropletsContent() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-[#2e3d49]">Spinning up Compute: A Comprehensive Guide to Tiwlo Droplets</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Droplets are the fundamental compute units of Tiwlo. These scalable, secure, and performant virtual machines are designed to meet the demands of every application, from simple static websites to resource-hungry containerized microservices and AI workloads.
      </p>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-[#2e3d49]">Understanding Droplet Types</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Tiwlo offers various Droplet types to optimize performance and cost for your specific use cases:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#4a4a4a] space-y-2">
          <li><strong>Basic Droplets:</strong> Ideal for balanced web servers, blogs, and development environments.</li>
          <li><strong>CPU-Optimized:</strong> Packed with intensive processing power for game servers, high-performance computing, and intensive data processing tasks.</li>
          <li><strong>Memory-Optimized:</strong> Huge RAM capacity for massive caches and in-memory databases like Redis or large PostgreSQL instances.</li>
        </ul>
      </section>

      <div className="border border-gray-200 p-8">
        <h4 className="font-bold text-[#2e3d49] text-sm mb-4 uppercase tracking-widest">Step-by-Step Deployment</h4>
        <ol className="list-decimal pl-5 text-sm text-[#4a4a4a] space-y-4">
          <li><strong>Initiate:</strong> Open the dashboard and click <span className="font-bold">Create</span>, then <span className="font-bold">Droplets</span>.</li>
          <li><strong>Select Image:</strong> Choose an OS that best suits your stack (Ubuntu, Debian, Fedora, AlmaLinux, or from our curated Marketplace apps). All images are pre-hardened by the Tiwlo security team.</li>
          <li><strong>Instance Sizing:</strong> Select a size based on CPU and RAM. Ensure your selection allows for growth.</li>
          <li><strong>Region Selection:</strong> Choose the data center region nearest to your target audience to ensure lowest latency.</li>
          <li><strong>Authentication:</strong> This is critical. Use SSH keys rather than password authentication for superior security.</li>
          <li><strong>Networking & Extras:</strong> Enable Backups, Monitoring, and VPC networking as required.</li>
          <li><strong>Finish:</strong> Name your Droplet and click <span className="font-bold">Create</span>. Your instance will be ready in seconds.</li>
        </ol>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-[#2e3d49]">Essential Maintenance & Scaling</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Post-deployment management is just as critical. Tiwlo provides a suite of tools for monitoring, upgrading, and securing your Droplets.
          Regularly apply security patches to your OS, configure firewalls via the Networking panel, and utilize backups to ensure business continuity.
        </p>
      </section>
    </div>
  );
}
