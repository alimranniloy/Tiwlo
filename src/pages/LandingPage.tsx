import React from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Stats from '../components/landing/Stats';
import Features from '../components/landing/Features';
import ISPSection from '../components/landing/ISPSection';
import EcommerceSection from '../components/landing/EcommerceSection';
import EdgeSection from '../components/landing/EdgeSection';
import BentoSection from '../components/landing/BentoSection';
import IntegrationsSection from '../components/landing/IntegrationsSection';
import SecuritySection from '../components/landing/SecuritySection';
import EnterpriseSection from '../components/landing/EnterpriseSection';
import ComplianceSection from '../components/landing/ComplianceSection';
import SupportSection from '../components/landing/SupportSection';
import FAQSection from '../components/landing/FAQSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import ProcessSection from '../components/landing/ProcessSection';
import InfrastructureSection from '../components/landing/InfrastructureSection';
import MigrationSection from '../components/landing/MigrationSection';
import DeveloperSection from '../components/landing/DeveloperSection';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 scroll-smooth">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <IntegrationsSection />
        <Features />
        <ProcessSection />
        <ISPSection />
        <InfrastructureSection />
        <SecuritySection />
        <EdgeSection />
        <DeveloperSection />
        <EcommerceSection />
        <MigrationSection />
        <EnterpriseSection />
        <BentoSection />
        <TestimonialsSection />
        <ComplianceSection />
        <FAQSection />
        <CTA />
        <SupportSection />
      </main>
      <Footer />
    </div>
  );
}
