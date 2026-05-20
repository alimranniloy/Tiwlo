import { useParams } from 'react-router-dom';
import { Database, HardDrive, Network, Server, Shield } from 'lucide-react';
import ResourceManagerPage from '../../components/ResourceManagerPage';
import WhmHostingModule from './hosting/WhmHostingModule';

const configs = {
  compute: {
    type: 'system_server',
    title: 'Compute Nodes',
    description: 'Admin-owned infrastructure nodes and imported control panel servers.',
    createLabel: 'Add Compute Node',
    emptyTitle: 'No compute nodes found',
    emptyDescription: 'Connect or create a compute node to manage platform infrastructure.',
    icon: Server,
    accentClass: 'bg-blue-600',
    defaults: { region: 'Global', specs: '4 vCPU / 8 GB RAM / 160 GB SSD', monthlyCost: 80, metadata: { role: 'compute' } }
  },
  volume: {
    type: 'volume',
    title: 'Block Storage',
    description: 'Platform storage volumes created through the cloud resource API.',
    createLabel: 'Create Volume',
    emptyTitle: 'No block storage volumes found',
    emptyDescription: 'Create a database-backed storage volume for customer or infrastructure workloads.',
    icon: HardDrive,
    accentClass: 'bg-emerald-600',
    defaults: { region: 'New York 3', specs: '100 GB SSD block storage', disk: '100 GB', monthlyCost: 10, metadata: { class: 'ssd' } }
  },
  database: {
    type: 'database',
    title: 'Data Instances',
    description: 'Managed database instances visible to platform administrators.',
    createLabel: 'Create Data Instance',
    emptyTitle: 'No data instances found',
    emptyDescription: 'Provision a database record for PostgreSQL, MySQL, Redis, or analytics workloads.',
    icon: Database,
    accentClass: 'bg-indigo-600',
    defaults: { region: 'Singapore 1', specs: 'PostgreSQL / 2 vCPU / 4 GB RAM', monthlyCost: 35, metadata: { engine: 'postgresql' } }
  },
  network: {
    type: 'network',
    title: 'Network Topology',
    description: 'VPCs, private networks, and interconnect records from the cloud resource API.',
    createLabel: 'Create Network',
    emptyTitle: 'No network topology records found',
    emptyDescription: 'Create a real network record for VPC, peering, or backbone planning.',
    icon: Network,
    accentClass: 'bg-cyan-600',
    defaults: { region: 'Global', specs: 'Private VPC / 10.0.0.0/16', monthlyCost: 0, metadata: { cidr: '10.0.0.0/16' } }
  },
  firewall: {
    type: 'firewall',
    title: 'Edge Firewalls',
    description: 'Firewall policies and perimeter protection resources across the platform.',
    createLabel: 'Create Firewall',
    emptyTitle: 'No edge firewalls found',
    emptyDescription: 'Create a firewall policy record backed by the resource API.',
    icon: Shield,
    accentClass: 'bg-red-600',
    defaults: { region: 'Global', specs: 'Inbound deny / HTTPS allowed', monthlyCost: 0, metadata: { policy: 'edge' } }
  }
};

type ResourceKey = keyof typeof configs;

export default function AdminResourcesPage() {
  const { kind } = useParams();
  if (!kind || kind === 'compute') return <WhmHostingModule />;

  const config = configs[(kind as ResourceKey) || 'compute'] || configs.compute;
  return <ResourceManagerPage {...config} />;
}
