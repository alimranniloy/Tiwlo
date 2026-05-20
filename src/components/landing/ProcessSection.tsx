import React from 'react';

export default function ProcessSection() {
  const steps = [
    { n: '01', title: 'Pick a Plan', desc: 'Choose the hosting or ISP tier that fits your scale.' },
    { n: '02', title: 'Instance Launch', desc: 'Our automated system deploys your nodes in seconds.' },
    { n: '03', title: 'Global Sync', desc: 'Integrate your WHM or ISP billing with our central hub.' },
    { n: '04', title: 'Go Live', desc: 'Accept payments and manage users from one professional dashboard.' }
  ];

  return (
    <section className="py-10 px-6 border-t border-gray-100 bg-gray-50/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative p-2">
              <div className="text-4xl font-black text-gray-100 mb-2">{step.n}</div>
              <div className="px-2">
                <h3 className="text-sm font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
