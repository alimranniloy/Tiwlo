import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
  { name: 'Mon', sales: 4200 },
  { name: 'Tue', sales: 3800 },
  { name: 'Wed', sales: 5100 },
  { name: 'Thu', sales: 4800 },
  { name: 'Fri', sales: 6200 },
  { name: 'Sat', sales: 5500 },
  { name: 'Sun', sales: 7100 },
];

export default function SalesPerformance() {
  return (
    <div className="bg-white p-6 rounded border border-gray-200 space-y-6">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Net Sales Performance</h3>
             <p className="text-xs text-gray-400 font-medium">Daily performance across all channels</p>
          </div>
          <select className="bg-gray-50 border border-gray-200 text-[10px] font-bold p-1 rounded outline-none cursor-pointer uppercase tracking-tighter">
             <option>Last 7 Days</option>
             <option>Last 30 Days</option>
          </select>
       </div>
       
       <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                   dy={10}
                />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                   type="monotone" 
                   dataKey="sales" 
                   stroke="#2563eb" 
                   strokeWidth={2} 
                   fillOpacity={1} 
                   fill="url(#colorSales)" 
                />
             </AreaChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
}
