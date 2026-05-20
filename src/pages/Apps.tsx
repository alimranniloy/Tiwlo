import { LayoutGrid } from 'lucide-react';
import ResourceManagerPage from '../components/ResourceManagerPage';

export default function AppsPage() {
  return (
    <ResourceManagerPage
      type="app"
      title="App Platform"
      description="Managed application deployments loaded from the platform database."
      createLabel="Create App"
      emptyTitle="No apps deployed"
      emptyDescription="Create an app deployment record and connect repository/build metadata through the API."
      icon={LayoutGrid}
      accentClass="bg-purple-600"
      defaults={{
        region: 'Global',
        specs: 'Managed app / auto deploy',
        plan: 'app-platform',
        monthlyCost: 5,
        metadata: { repository: '', branch: 'main' }
      }}
    />
  );
}
