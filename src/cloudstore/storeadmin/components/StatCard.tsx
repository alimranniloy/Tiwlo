import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon: any;
  color: string;
  bg: string;
}

export default function StatCard({ label, value, trend, icon: Icon, color, bg }: StatCardProps) {
  const isUp = trend?.startsWith('+');
  
  return (
    <div className="bg-white p-5 rounded border border-gray-200">
       <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 ${bg} ${color} rounded`}>
             <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-[11px] font-bold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
               {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
               {trend}
            </div>
          )}
       </div>
       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
       <h3 className="text-2xl font-black text-gray-900">{value}</h3>
    </div>
  );
}
