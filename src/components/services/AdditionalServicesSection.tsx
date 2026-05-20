import { Terminal, ShoppingBasket, Layers3, Briefcase, Zap } from 'lucide-react';

const extraServices = [
    { title: 'CLI Tooling', desc: 'Manage your infrastructure directly from the terminal.', icon: Terminal },
    { title: 'Marketplace', desc: 'Deploy optimized application stacks in one click.', icon: ShoppingBasket },
    { title: 'Terraform Provider', desc: 'Manage Tiwlo resources with Infrastructure-as-Code.', icon: Layers3 },
    { title: 'Global Edge Network', desc: 'Deliver content quickly with our edge nodes.', icon: Zap },
    { title: 'Expert Consulting', desc: 'Architectural advice from our certified engineers.', icon: Briefcase },
];

export default function AdditionalServicesSection() {
    return (
        <section className="mt-16 pt-16 border-t border-gray-200">
            <h2 className="text-2xl font-black text-[#2e3d49] mb-10 uppercase tracking-tighter">Additional Platform Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {extraServices.map(s => (
                    <div key={s.title} className="border border-gray-200 p-6 flex flex-col items-center text-center bg-gray-50">
                        <s.icon className="h-8 w-8 text-blue-600 mb-4" />
                        <h4 className="font-bold text-[#2e3d49] text-sm mb-2">{s.title}</h4>
                        <p className="text-xs text-[#4a4a4a]">{s.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
