export default function APIContent() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-[#2e3d49]">Tiwlo Full-Featured REST API</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Automate your entire infrastructure lifecycle with the Tiwlo REST API. Designed for developers and DevOps engineers, our API exposes every platform action as a secure, predictable endpoint.
      </p>

      <div className="bg-gray-50 p-6 border-l-4 border-blue-600">
        <h3 className="font-bold text-[#2e3d49] text-sm uppercase tracking-widest mb-2">Authentication</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed mb-4">
          All API requests must be authenticated using a Personal Access Token (PAT). Generate your token in your <strong>Settings</strong> panel.
        </p>
        <code className="bg-gray-200 text-xs p-3 block font-mono text-gray-800">Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN</code>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-[#2e3d49] text-xl">Key Concepts</h3>
        <ul className="list-disc pl-5 text-sm text-[#4a4a4a] space-y-2">
          <li><strong>JSON Content-Type:</strong> Every request body must be JSON, and every response body is JSON.</li>
          <li><strong>Versioning:</strong> Versioned via path: <code>https://api.tiwlo.com/v2/...</code></li>
          <li><strong>Rate Limiting:</strong> Enforced per-token. Standard tier allows 5000 requests per hour.</li>
          <li><strong>Errors:</strong> Standard HTTP status codes (2xx for success, 4xx/5xx for errors with descriptive JSON bodies).</li>
        </ul>
      </div>

      <div className="border border-gray-200 p-8">
        <h3 className="font-bold text-[#2e3d49] text-xl mb-4">Endpoints Overview</h3>
        <div className="space-y-4">
          {[
            { method: 'GET', path: '/v2/droplets', desc: 'List all Droplets' },
            { method: 'POST', path: '/v2/droplets', desc: 'Deploy new Droplet instance' },
            { method: 'GET', path: '/v2/databases', desc: 'List database clusters' },
            { method: 'POST', path: '/v2/firewalls', desc: 'Create network firewall rules' },
            { method: 'GET', path: '/v2/account/billing', desc: 'Retrieve recent invoices' },
          ].map(ep => (
            <div key={ep.path} className="flex gap-4 text-sm">
              <span className={`font-mono font-bold w-20 px-2 py-1 ${ep.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {ep.method}
              </span>
              <code className="font-mono text-gray-700 w-60">{ep.path}</code>
              <span className="text-gray-500">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-[#2e3d49] text-xl">Best Practices</h3>
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          For production automation, implement exponential backoff on 429 Too Many Requests errors. Use idempotent keys when creating resources to prevent accidental duplicates during network retries. Always store your tokens as environment secrets—never hardcode PATs in your source code.
        </p>
      </div>
    </div>
  );
}
