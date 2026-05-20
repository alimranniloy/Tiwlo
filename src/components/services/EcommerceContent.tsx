export default function eCommerceContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">eCommerce Hosting & Optimization</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Tiwlo provides the robust, high-performance infrastructure required to power modern eCommerce storefronts. Whether you're running a boutique shop or a high-traffic enterprise platform, our infrastructure is designed to ensure maximum uptime, rapid page loads, and seamless checkout experiences.
      </p>

      <section className="space-y-4">
        <h3 className="text-xl font-bold text-[#2e3d49]">Choose Your Deployment Path</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 p-6">
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Marketplace (One-Click)</h4>
            <p className="text-sm text-[#4a4a4a]">Perfect for rapid deployment. Get WooCommerce or PrestaShop running in less than 60 seconds. Our pre-configured images handle all dependencies automatically.</p>
          </div>
          <div className="border border-gray-200 p-6">
            <h4 className="font-bold text-[#2e3d49] text-sm mb-2">Manual Stack (Custom)</h4>
            <p className="text-sm text-[#4a4a4a]">Full control over your environment. Deploy on CPU-optimized Droplets, customize your web server (Nginx/Apache), database configurations, and caching layers.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-bold text-[#2e3d49]">Optimizing for Scale</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          High traffic events like sales can crush poorly architected shops. Optimization is key to sustaining growth:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#4a4a4a] space-y-2">
          <li><strong>Database Optimization:</strong> Utilize our Managed Databases to offload DB processing from your web server, and enable read replicas for global performance.</li>
          <li><strong>Load Balancing:</strong> Distribute incoming traffic across multiple Droplet instances using a Tiwlo Load Balancer.</li>
          <li><strong>Caching Strategy:</strong> Implement Redis for object caching and Varnish for full-page caching to drastically reduce server CPU load.</li>
          <li><strong>Fast Delivery (CDN):</strong> Serve static assets (images, CSS, JS) from an Object Storage (Spaces) bucket, fronted by our edge network.</li>
        </ul>
      </section>

      <div className="border border-gray-200 p-8 bg-gray-50 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-1">Ready to launch?</h4>
          <p className="text-sm text-[#4a4a4a]">Deploy your optimized eCommerce stack in minutes.</p>
        </div>
        <a href="/droplets/create" className="bg-blue-600 text-white px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors">
          Deploy eCommerce Stack
        </a>
      </div>
    </div>
  );
}
