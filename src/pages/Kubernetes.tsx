import { Box } from 'lucide-react';
import ResourceManagerPage from '../components/ResourceManagerPage';

export default function KubernetesPage() {
  return (
    <ResourceManagerPage
      type="kubernetes"
      title="Kubernetes Clusters"
      description="Managed Kubernetes clusters loaded from the platform API."
      createLabel="Create Cluster"
      emptyTitle="No Kubernetes clusters found"
      emptyDescription="Create a cluster record to manage nodes, version, cost, and lifecycle from the database."
      icon={Box}
      accentClass="bg-indigo-600"
      defaults={{
        region: 'New York 3',
        specs: 'Kubernetes 1.29 / 3 worker nodes',
        plan: 'kubernetes-standard',
        cpu: '6 vCPU',
        ram: '12 GB',
        disk: '120 GB',
        monthlyCost: 72,
        metadata: { version: '1.29', nodePools: 1 }
      }}
    />
  );
}
