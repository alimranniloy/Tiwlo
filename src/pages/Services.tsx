import React, { useState } from 'react';
import { 
  Server, 
  Globe, 
  Shield, 
  ShoppingBag,
  Terminal,
  Lock,
  Database,
  Code2,
  Search,
  Activity,
  CreditCard,
  HelpCircle,
  Cpu,
  Zap,
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import LoginContent from '../components/services/LoginContent';
import DropletsContent from '../components/services/DropletsContent';
import DNSContent from '../components/services/DNSContent';
import EcommerceContent from '../components/services/EcommerceContent';
import APIContent from '../components/services/APIContent';
import VPCContent from '../components/services/VPCContent';
import LBContent from '../components/services/LBContent';
import DBContent from '../components/services/DBContent';
import BackupsContent from '../components/services/BackupsContent';
import MonitoringContent from '../components/services/MonitoringContent';
import BillingContent from '../components/services/BillingContent';
import SupportContent from '../components/services/SupportContent';
import K8sContent from '../components/services/K8sContent';
import FunctionsContent from '../components/services/FunctionsContent';
import SpacesContent from '../components/services/SpacesContent';
import ConsoleContent from '../components/services/ConsoleContent';
import SecurityAuditContent from '../components/services/SecurityAuditContent';
import AdditionalServicesSection from '../components/services/AdditionalServicesSection';

export default function ServicesPage() {
  const [activeSection, setActiveSection] = useState('Login');
  const [searchTerm, setSearchTerm] = useState('');

  const sections = [
    { id: 'Login', title: 'Login & Security', icon: Lock, component: LoginContent },
    { id: 'Droplets', title: 'Compute (Droplets)', icon: Server, component: DropletsContent },
    { id: 'Ecommerce', title: 'eCommerce Setup', icon: ShoppingBag, component: EcommerceContent },
    { id: 'DNS', title: 'Setup DNS', icon: Globe, component: DNSContent },
    { id: 'VPC', title: 'VPC Networking', icon: Shield, component: VPCContent },
    { id: 'LB', title: 'Load Balancers', icon: Terminal, component: LBContent },
    { id: 'DB', title: 'Managed Databases', icon: Database, component: DBContent },
    { id: 'API', title: 'API Automation', icon: Code2, component: APIContent },
    { id: 'Backups', title: 'Backups & Recovery', icon: Server, component: BackupsContent },
    { id: 'Monitoring', title: 'Monitoring', icon: Activity, component: MonitoringContent },
    { id: 'Billing', title: 'Managed Billing', icon: CreditCard, component: BillingContent },
    { id: 'Support', title: 'Support', icon: HelpCircle, component: SupportContent },
    { id: 'K8s', title: 'Managed Kubernetes', icon: Cpu, component: K8sContent },
    { id: 'Functions', title: 'Serverless Functions', icon: Zap, component: FunctionsContent },
    { id: 'Spaces', title: 'Object Storage (Spaces)', icon: Globe, component: SpacesContent },
    { id: 'Console', title: 'Cloud Console', icon: LayoutDashboard, component: ConsoleContent },
    { id: 'Audit', title: 'Security Audit', icon: ShieldAlert, component: SecurityAuditContent },
  ];

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentSection = filteredSections.find(s => s.id === activeSection) || filteredSections[0];
  const ContentComponent = currentSection?.component || sections[0].component;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Navbar />
      <main className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <div className="border-b border-gray-200 pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h1 className="text-3xl font-black text-[#2e3d49] uppercase tracking-tighter">Services & Setup Guides</h1>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search guides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border border-gray-200">
           {/* Sidebar Navigation */}
           <div className="border-r border-gray-200 bg-gray-50">
             {filteredSections.length > 0 ? (
                 filteredSections.map(section => (
               <button 
                 key={section.id}
                 onClick={() => {
                     setActiveSection(section.id);
                 }}
                 className={`w-full flex items-center gap-3 px-6 py-4 text-[13px] font-bold border-b border-gray-200 last:border-b-0 ${
                   activeSection === section.id 
                   ? 'bg-white text-blue-600' 
                   : 'text-[#4a4a4a] hover:bg-white'
                 }`}
               >
                 <section.icon className="h-4 w-4" />
                 {section.title}
               </button>
             ))
             ) : (
                <div className="p-6 text-sm text-gray-500 text-center">No guides found.</div>
             )}
           </div>

           {/* Content Area */}
           <div className="lg:col-span-3 p-10 min-h-[500px]">
              {currentSection ? <ContentComponent /> : <div className="text-center mt-20 text-gray-500">Pick a guide to get started.</div>}
           </div>
        </div>
        <AdditionalServicesSection />
      </main>
      <Footer />
    </div>
  );
}
