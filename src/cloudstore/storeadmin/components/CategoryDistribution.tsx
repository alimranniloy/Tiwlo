import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Apparel', value: 450, color: '#2563eb' },
  { name: 'Footwear', value: 300, color: '#8b5cf6' },
  { name: 'Accessories', value: 250, color: '#10b981' },
];

export default function CategoryDistribution() {
  return (
    <div className="bg-white p-6 rounded border border-gray-200 flex flex-col">
       <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inventory Distribution</h3>
          <p className="text-lg font-black text-gray-900 mt-1">Product Categories</p>
       </div>
       
       <div className="h-[220px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
             <PieChart>
                <Pie
                   data={data}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                >
                   {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                   ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                />
                <Legend 
                   verticalAlign="bottom" 
                   align="center"
                   iconType="circle"
                   iconSize={8}
                   wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }}
                />
             </PieChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
}
