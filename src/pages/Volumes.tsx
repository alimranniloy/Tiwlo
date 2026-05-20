import { HardDrive } from 'lucide-react';
import ResourceManagerPage from '../components/ResourceManagerPage';

export default function VolumesPage() {
  return (
    <ResourceManagerPage
      type="volume"
      title="Block Storage Volumes"
      description="Scalable block storage records loaded from the database."
      createLabel="Create Volume"
      emptyTitle="No volumes found"
      emptyDescription="Create a volume and it will be stored through the real API."
      icon={HardDrive}
      accentClass="bg-slate-700"
      defaults={{
        region: 'New York 3',
        specs: '100 GB SSD Block Storage',
        disk: '100 GB',
        plan: 'storage',
        monthlyCost: 10,
        metadata: { attachedTo: '' }
      }}
    />
  );
}
