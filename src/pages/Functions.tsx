import { Zap } from 'lucide-react';
import ResourceManagerPage from '../components/ResourceManagerPage';

export default function FunctionsPage() {
  return (
    <ResourceManagerPage
      type="function"
      title="Serverless Functions"
      description="Function deployments and invocation services backed by real API records."
      createLabel="Create Function"
      emptyTitle="No functions deployed"
      emptyDescription="Create a function resource to track runtime, region, and status in the database."
      icon={Zap}
      accentClass="bg-amber-500"
      defaults={{
        region: 'Global',
        specs: 'Node.js runtime / HTTP trigger',
        plan: 'serverless',
        monthlyCost: 0,
        metadata: { runtime: 'nodejs', trigger: 'http' }
      }}
    />
  );
}
