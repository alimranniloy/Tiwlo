import { Database } from 'lucide-react';
import ResourceManagerPage from '../components/ResourceManagerPage';

export default function DatabasesPage() {
  return (
    <ResourceManagerPage
      type="database"
      title="Managed Databases"
      description="Database clusters and services backed by cloud resource records."
      createLabel="Create Database"
      emptyTitle="No database clusters found"
      emptyDescription="Create a database resource to track cluster status, region, cost, and configuration."
      icon={Database}
      accentClass="bg-blue-600"
      defaults={{
        region: 'Frankfurt 1',
        specs: 'PostgreSQL / 1 node / automated backups',
        plan: 'managed-db',
        cpu: '1 vCPU',
        ram: '2 GB',
        disk: '25 GB',
        monthlyCost: 15,
        metadata: { engine: 'PostgreSQL', backups: true }
      }}
    />
  );
}
