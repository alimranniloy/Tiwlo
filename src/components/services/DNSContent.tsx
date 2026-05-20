export default function DNSContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Global Anycast DNS Infrastructure</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo&apos;s Anycast DNS is a high-performance, resilient domain name resolution service designed for mission-critical applications. By leveraging a global network of anycast nodes, we ensure that DNS queries are routed to the nearest geographically optimal server, drastically reducing latency and providing automatic failover in the event of local node disruptions.
      </p>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Why Anycast DNS?</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Traditional DNS relies on specific IP addresses for nameservers, which creates single points of failure and forces global traffic to arbitrary locations. Anycast DNS advertises the same set of IP addresses across hundreds of global nodes, fundamentally changing how traffic is routed:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#4a4a4a] space-y-2">
          <li><strong>Optimized Latency:</strong> Users connect to the physically closest nameserver node.</li>
          <li><strong>DDoS Resilience:</strong> Traffic is naturally distributed across our entire global network, preventing single-node saturation.</li>
          <li><strong>High Availability:</strong> If one node goes down, BGP routing automatically steers queries to the next closest healthy node without client-side intervention.</li>
        </ul>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Setup & Propagation</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Configuring your domain is straightforward. Update your domain registrar records to point to our authoritative nameserver cluster. Once updated, propagation typically occurs within minutes, though global systems may take up to 48 hours to cache the new records.
        </p>
        <div className="border border-gray-200 p-8 pt-4">
          <h4 className="font-bold text-[#2e3d49] text-sm mb-4 uppercase tracking-widest">Set these nameservers at your registrar:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm bg-gray-50 border border-gray-200 p-6">
            <div className="text-center">ns1.tiwlo.com</div>
            <div className="text-center">ns2.tiwlo.com</div>
            <div className="text-center">ns3.tiwlo.com</div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-[#2e3d49]">Advanced Records Management</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          Once your domain is active on our nameservers, you can manage records directly through our platform. We support all common record types (A, AAAA, CNAME, TXT, MX, SRV, CAA, SOA) and provide tools for bulk imports via zone files.
        </p>
      </section>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Ready to update records?</h4>
          <p className="text-sm text-[#4a4a4a]">Manage your zones, add records, and track propagation.</p>
        </div>
        <a href="/domains" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors">
          Manage DNS
        </a>
      </div>
    </div>
  );
}
