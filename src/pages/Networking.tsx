import { Network } from 'lucide-react';
import ResourceManagerPage from '../components/ResourceManagerPage';

export default function NetworkingPage() {
  return (
    <ResourceManagerPage
      type="network"
      title="Networking"
      description="VPCs, private networks, and network services connected to real API records."
      createLabel="Create Network"
      emptyTitle="No network resources found"
      emptyDescription="Create a VPC or network resource and manage it from the database-backed console."
      icon={Network}
      accentClass="bg-cyan-700"
      defaults={{
        region: 'Global',
        specs: 'Private VPC / 10.0.0.0/20',
        plan: 'networking',
        monthlyCost: 0,
        metadata: { cidr: '10.0.0.0/20', peering: false }
      }}
    />
  );
}
