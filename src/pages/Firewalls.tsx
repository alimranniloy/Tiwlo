import { Shield } from 'lucide-react';
import ResourceManagerPage from '../components/ResourceManagerPage';

export default function FirewallsPage() {
  return (
    <ResourceManagerPage
      type="firewall"
      title="Cloud Firewalls"
      description="Firewall policies are stored and managed through the cloud resource API."
      createLabel="Create Firewall"
      emptyTitle="No firewalls found"
      emptyDescription="Create a firewall policy to track rules, protected resources, and lifecycle status."
      icon={Shield}
      accentClass="bg-gray-900"
      defaults={{
        region: 'Global',
        specs: 'Inbound SSH/HTTP/HTTPS policy',
        plan: 'security',
        monthlyCost: 0,
        metadata: { rules: 3, protectedResources: 0 }
      }}
    />
  );
}
