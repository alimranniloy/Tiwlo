import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Filter,
  Grid2X2,
  Headphones,
  Info,
  KeyRound,
  LayoutList,
  List,
  MapPin,
  MoreVertical,
  Plus,
  Power,
  Search,
  Server,
  Terminal,
  Trash2,
  X
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Droplet } from '../types';
import {
  changeTPanelResourcePasswordWithApi,
  createTPanelResourceLoginWithApi,
  deleteDropletWithApi,
  updateDropletStatusWithApi
} from '../lib/tiwloApi';
import { useActionConfirmation } from '../components/ActionConfirmation';

interface DropletsProps {
  droplets: Droplet[];
  setDroplets: (droplets: Droplet[]) => void;
}

const cardClass = 'rounded-[8px] border border-[#e8edf7] bg-white';
const textInk = 'text-[#071437]';
const textMuted = 'text-[#65738a]';

const fallbackMonitoring = [
  { name: '00', value: 24 },
  { name: '10', value: 34 },
  { name: '20', value: 31 },
  { name: '30', value: 49 },
  { name: '40', value: 43 },
  { name: '50', value: 36 },
  { name: '60', value: 46 },
  { name: '70', value: 39 },
  { name: '80', value: 56 },
  { name: '90', value: 43 },
  { name: '100', value: 49 }
];

const statusOptions = ['all', 'active', 'off', 'restarting'] as const;

function metadataOf(droplet?: Droplet | null) {
  return (droplet?.metadata || {}) as Record<string, any>;
}

function numberFromMetadata(droplet: Droplet, keys: string[], fallback: number) {
  const metadata = metadataOf(droplet);
  for (const key of keys) {
    const parts = key.split('.');
    let value: any = metadata;
    for (const part of parts) {
      value = value?.[part];
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(100, Math.round(numeric)));
  }
  return fallback;
}

function cpuUsage(droplet: Droplet) {
  return numberFromMetadata(droplet, ['metrics.cpu', 'metrics.cpuUsage', 'usage.cpu', 'usage.cpuUsage', 'monitoring.cpu'], 24);
}

function ramUsage(droplet: Droplet) {
  return numberFromMetadata(droplet, ['metrics.ram', 'metrics.ramUsage', 'usage.ram', 'usage.ramUsage', 'monitoring.ram'], 56);
}

function monitoringData(droplet?: Droplet | null) {
  const metadata = metadataOf(droplet);
  const history = metadata.metrics?.history || metadata.monitoring?.history || metadata.usage?.history;
  if (Array.isArray(history) && history.length > 1) {
    return history.slice(0, 18).map((value: any, index: number) => ({
      name: String(index),
      value: Math.max(0, Math.min(100, Number(value) || 0))
    }));
  }
  return fallbackMonitoring;
}

function compactRelative(value?: string) {
  if (!value) return 'just now';
  return value
    .replace(/\bminutes?\b/g, 'm')
    .replace(/\bhours?\b/g, 'h')
    .replace(/\bdays?\b/g, 'd')
    .replace(/\bweeks?\b/g, 'w')
    .replace(/\s+ago$/i, ' ago');
}

function uptimeLabel(droplet: Droplet) {
  const metadata = metadataOf(droplet);
  if (metadata.uptimeLabel) return String(metadata.uptimeLabel);
  if (metadata.uptime) return String(metadata.uptime);
  if (droplet.status !== 'active') return 'Offline';
  return compactRelative(droplet.createdAt || '2d ago').replace(' ago', '');
}

function planLabel(droplet: Droplet) {
  const metadata = metadataOf(droplet);
  return String(droplet.plan || metadata.packageName || metadata.tpanelAccount?.packageName || 'basic');
}

function splitResourceValue(value?: string, fallback = '-') {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return clean
    .replace(/\s*vcpus?$/i, '')
    .replace(/\s*cpu$/i, '')
    .replace(/\s*ram$/i, '')
    .replace(/\s*ssd$/i, '')
    .trim();
}

function cpuText(droplet: Droplet) {
  const value = splitResourceValue(droplet.cpu, '1');
  return value.toLowerCase().includes('vcpu') ? value : `${value} vCPU`;
}

function ramText(droplet: Droplet) {
  const value = splitResourceValue(droplet.ram, '1 GB');
  return value.toLowerCase().includes('gb') ? `${value} RAM` : `${value} GB RAM`;
}

function storageText(droplet: Droplet) {
  const value = splitResourceValue(droplet.disk, '25 GB');
  return value.toLowerCase().includes('gb') ? `${value} SSD` : `${value} GB SSD`;
}

function createdLabel(droplet: Droplet) {
  const metadata = metadataOf(droplet);
  return compactRelative(String(metadata.createdLabel || droplet.createdAt || '2d ago'));
}

function topLocation(droplets: Droplet[]) {
  const counts = droplets.reduce<Record<string, number>>((acc, droplet) => {
    const region = droplet.region || 'Chennai, TN, IN';
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {});
  const [region, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ['Chennai, TN, IN', 0];
  return { region, count };
}

function isRunning(droplet: Droplet) {
  return droplet.status === 'active';
}

function ServerTile({ droplet, small = false }: { droplet: Droplet; small?: boolean }) {
  return (
    <div className={`relative grid shrink-0 place-items-center rounded-[16px] bg-[#eef2ff] ${small ? 'h-10 w-10' : 'h-[72px] w-[72px]'}`}>
      <div className={`absolute rounded-[7px] border border-[#dce5ff] bg-white ${small ? 'h-5 w-6' : 'h-9 w-11'} -translate-y-1 rotate-[-17deg]`} />
      <div className={`absolute rounded-[7px] border border-[#dce5ff] bg-[#f7f9ff] ${small ? 'h-5 w-6' : 'h-9 w-11'} translate-y-1 rotate-[-17deg]`} />
      <Server className={`relative text-[#617085] ${small ? 'h-4 w-4' : 'h-6 w-6'}`} />
      <span className={`absolute rounded-full border-[3px] border-white ${isRunning(droplet) ? 'bg-emerald-500' : 'bg-slate-300'} ${small ? '-right-1 -top-1 h-3.5 w-3.5' : '-right-1 top-1.5 h-[18px] w-[18px]'}`} />
    </div>
  );
}

function UsageBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[38px_1fr_38px] items-center gap-3">
      <span className={`font-display text-[14px] font-extrabold ${textInk}`}>{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#e9eef7]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-right font-display text-[14px] font-extrabold ${textInk}`}>{value}%</span>
    </div>
  );
}

function SpecBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5 text-center">
      <p className={`font-display text-[14px] font-extrabold ${textInk}`}>{value}</p>
      <p className={`mt-1 text-[11px] font-semibold ${textMuted}`}>{label}</p>
    </div>
  );
}

function ActionButton({
  children,
  className = '',
  disabled,
  large = false,
  onClick,
  title
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  large?: boolean;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid place-items-center border border-[#edf1f7] bg-white transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50 ${large ? 'h-12 w-12 rounded-[12px]' : 'h-[34px] w-[34px] rounded-[8px]'} ${className}`}
    >
      {children}
    </button>
  );
}

function MonitoringPanel({ droplet }: { droplet: Droplet }) {
  const data = monitoringData(droplet);
  const label = ramUsage(droplet);

  return (
    <div>
      <h3 className={`mb-4 text-[11px] font-extrabold uppercase tracking-normal ${textMuted}`}>Monitoring (1h)</h3>
      <div className="relative h-[108px] pl-7">
        <div className="absolute left-0 top-0 flex h-[88px] flex-col justify-between text-[9px] font-semibold text-[#7d8ca3]">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="absolute left-7 right-1 top-3 h-[80px] bg-[linear-gradient(to_bottom,#edf1f7_1px,transparent_1px)] [background-size:100%_28px]" />
        <div className="absolute left-[64%] top-[25px] z-10 rounded-[6px] bg-[#7357f6] px-2 py-0.5 text-[10px] font-extrabold text-white">
          {label}%
        </div>
        <ResponsiveContainer width="100%" height={96}>
          <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="dropletMonitorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7357f6" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#7357f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#7357f6"
              strokeWidth={2}
              fill="url(#dropletMonitorFill)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className={`mt-1 flex items-center gap-1 text-[11px] font-extrabold uppercase ${textMuted}`}>
        No metrics API data <Info className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function DropletActions({
  droplet,
  actionLoading,
  compact = false,
  deleteDroplet,
  openTPanelLogin,
  setSelectedDroplet,
  toggleStatus
}: {
  droplet: Droplet;
  actionLoading: string;
  compact?: boolean;
  deleteDroplet: (id: string) => void;
  openTPanelLogin: (droplet: Droplet) => void;
  setSelectedDroplet: (droplet: Droplet) => void;
  toggleStatus: (id: string) => void;
}) {
  const tpanel = Boolean(metadataOf(droplet).tpanelAccount || metadataOf(droplet).deploymentNode?.module === 'tpanel');

  return (
    <div className={compact ? 'flex items-center gap-1' : 'grid grid-cols-2 place-items-center gap-4'}>
      <ActionButton
        title={isRunning(droplet) ? 'Power Off' : 'Power On'}
        disabled={actionLoading === `power:${droplet.id}`}
        onClick={() => toggleStatus(droplet.id)}
        large={!compact}
        className="text-amber-500"
      >
        <Power className="h-[18px] w-[18px]" />
      </ActionButton>
      <ActionButton
        title={tpanel ? 'tPanel Login' : 'Open resource portal'}
        disabled={tpanel && actionLoading === `login:${droplet.id}`}
        onClick={() => (tpanel ? openTPanelLogin(droplet) : setSelectedDroplet(droplet))}
        large={!compact}
        className="text-blue-600"
      >
        <ExternalLink className="h-[18px] w-[18px]" />
      </ActionButton>
      <ActionButton title="Access Console" onClick={() => setSelectedDroplet(droplet)} large={!compact} className="text-slate-600">
        <Terminal className="h-[18px] w-[18px]" />
      </ActionButton>
      <ActionButton title="Destroy" onClick={() => deleteDroplet(droplet.id)} large={!compact} className="text-rose-500">
        <Trash2 className="h-[18px] w-[18px]" />
      </ActionButton>
      {compact && (
        <button type="button" className="grid h-[34px] w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-[#f8faff]" title="More actions">
          <MoreVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function FeaturedDropletCard({
  actionLoading,
  deleteDroplet,
  droplet,
  openTPanelLogin,
  setSelectedDroplet,
  toggleStatus
}: {
  actionLoading: string;
  deleteDroplet: (id: string) => void;
  droplet?: Droplet;
  openTPanelLogin: (droplet: Droplet) => void;
  setSelectedDroplet: (droplet: Droplet) => void;
  toggleStatus: (id: string) => void;
}) {
  if (!droplet) {
    return (
      <section className={`${cardClass} p-12 text-center`}>
        <Server className="mx-auto mb-4 h-12 w-12 text-[#ccd5e4]" />
        <h2 className={`font-display text-[20px] font-extrabold ${textInk}`}>No droplets found</h2>
        <p className={`mt-2 text-[14px] font-medium ${textMuted}`}>Deploy your first cloud server to see live resource details here.</p>
      </section>
    );
  }

  const cpu = cpuUsage(droplet);
  const ram = ramUsage(droplet);

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(275px,1fr)_250px_132px]">
        <div className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row xl:flex-col">
            <div className="flex items-start gap-5">
              <ServerTile droplet={droplet} />
              <div className="min-w-0 pt-1">
                <h2 className={`truncate font-display text-[21px] font-extrabold leading-tight ${textInk}`}>{droplet.name}</h2>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isRunning(droplet) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-[13px] font-extrabold text-emerald-600">{isRunning(droplet) ? 'Running' : 'Off'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDroplet(droplet)}
                  className="mt-3 rounded-[6px] bg-[#f1ecff] px-3.5 py-1.5 text-[12px] font-extrabold text-[#5b21e6] hover:bg-[#e9ddff]"
                >
                  {planLabel(droplet)} portal
                </button>
                <div className="mt-2.5 w-fit rounded-[6px] bg-[#f5f7fb] px-3.5 py-1.5 text-[12px] font-semibold text-[#6a7486]">
                  Created: {createdLabel(droplet)}
                </div>
              </div>
            </div>

            <div className="sm:ml-auto sm:min-w-[210px] xl:ml-0 xl:min-w-0">
              <p className={`text-[11px] font-extrabold uppercase tracking-normal ${textMuted}`}>IP Address</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`font-display text-[20px] font-extrabold ${textInk}`}>{droplet.ip}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(droplet.ip).catch(() => undefined)}
                  className="grid h-7 w-7 place-items-center rounded-[7px] text-blue-600 hover:bg-blue-50"
                  title="Copy IP"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className={`mt-2.5 flex items-center gap-2 text-[13px] font-semibold ${textMuted}`}>
                <MapPin className="h-4 w-4" />
                {droplet.region || 'Chennai, TN, IN'}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#edf1f7] p-5 xl:border-l xl:border-t-0">
          <h3 className={`mb-6 text-[11px] font-extrabold uppercase tracking-normal ${textMuted}`}>Resources</h3>
          <div className="space-y-5">
            <UsageBar label="CPU" value={cpu} color="bg-blue-600" />
            <UsageBar label="RAM" value={ram} color="bg-[#5b21e6]" />
          </div>
          <div className="mt-7 grid grid-cols-3 divide-x divide-[#e6ebf4] rounded-[8px] border border-[#e8edf7] bg-[#fbfcff]">
            <SpecBox value={splitResourceValue(droplet.cpu, '1')} label="vCPU" />
            <SpecBox value={splitResourceValue(droplet.ram, '1 GB')} label="RAM" />
            <SpecBox value={splitResourceValue(droplet.disk, '25 GB')} label="Storage" />
          </div>
        </div>

        <div className="border-t border-[#edf1f7] p-5 xl:border-l xl:border-t-0">
          <MonitoringPanel droplet={droplet} />
        </div>

        <div className="border-t border-[#edf1f7] p-5 xl:border-l xl:border-t-0">
          <div className="mb-5 flex items-center justify-between">
            <h3 className={`text-[11px] font-extrabold uppercase tracking-normal ${textMuted}`}>Actions</h3>
            <MoreVertical className="h-4 w-4 text-[#6c778c]" />
          </div>
          <DropletActions
            actionLoading={actionLoading}
            deleteDroplet={deleteDroplet}
            droplet={droplet}
            openTPanelLogin={openTPanelLogin}
            setSelectedDroplet={setSelectedDroplet}
            toggleStatus={toggleStatus}
          />
        </div>
      </div>
    </section>
  );
}

function DropletsTable({
  actionLoading,
  deleteDroplet,
  droplets,
  openTPanelLogin,
  setSelectedDroplet,
  setStatusFilter,
  statusFilter,
  toggleStatus
}: {
  actionLoading: string;
  deleteDroplet: (id: string) => void;
  droplets: Droplet[];
  openTPanelLogin: (droplet: Droplet) => void;
  setSelectedDroplet: (droplet: Droplet) => void;
  setStatusFilter: (status: (typeof statusOptions)[number]) => void;
  statusFilter: (typeof statusOptions)[number];
  toggleStatus: (id: string) => void;
}) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-[#edf1f7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={`font-display text-[16px] font-extrabold ${textInk}`}>Droplets</h2>
        <div className="flex items-center gap-2">
          <label className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])}
              className="h-9 appearance-none rounded-[7px] border border-[#edf1f7] bg-white pl-3.5 pr-8 text-[12px] font-semibold capitalize text-[#43516a] outline-none hover:bg-[#f8faff]"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status === 'all' ? 'All Status' : status}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#617085]" />
          </label>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-[7px] border border-[#edf1f7] bg-white text-[#617085] hover:bg-[#f8faff]" title="Filter">
            <Filter className="h-4 w-4" />
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-[7px] bg-[#f3efff] text-[#5b21e6]" title="List view">
            <List className="h-4 w-4" />
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-[7px] border border-[#edf1f7] bg-white text-[#617085] hover:bg-[#f8faff]" title="Grid view">
            <Grid2X2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {droplets.length > 0 ? droplets.map((droplet) => (
          <div key={droplet.id} className="rounded-[8px] border border-[#edf1f7] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <ServerTile droplet={droplet} small />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-extrabold text-blue-600">{droplet.name}</p>
                  <p className={`mt-1 text-[12px] font-semibold ${textMuted}`}>{planLabel(droplet)} portal</p>
                  <p className={`mt-3 font-mono text-[13px] font-bold ${textInk}`}>{droplet.ip}</p>
                  <p className={`mt-1 text-[12px] font-semibold ${textMuted}`}>{droplet.region}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-extrabold ${isRunning(droplet) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {isRunning(droplet) ? 'Running' : 'Off'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 divide-x divide-[#edf1f7] rounded-[8px] border border-[#edf1f7] bg-[#fbfcff] text-center">
              <SpecBox value={cpuText(droplet)} label="" />
              <SpecBox value={ramText(droplet).replace(' RAM', '')} label="RAM" />
              <SpecBox value={storageText(droplet).replace(' SSD', '')} label="SSD" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-[12px] font-semibold ${textMuted}`}>Uptime: {uptimeLabel(droplet)}</p>
              <DropletActions
                compact
                actionLoading={actionLoading}
                deleteDroplet={deleteDroplet}
                droplet={droplet}
                openTPanelLogin={openTPanelLogin}
                setSelectedDroplet={setSelectedDroplet}
                toggleStatus={toggleStatus}
              />
            </div>
          </div>
        )) : (
          <div className="px-4 py-12 text-center">
            <Server className="mx-auto mb-4 h-12 w-12 text-[#ccd5e4]" />
            <h3 className={`font-display text-[18px] font-extrabold ${textInk}`}>No droplets found</h3>
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[940px] text-left">
          <thead className="bg-[#fbfcff]">
            <tr className={`text-[12px] font-extrabold uppercase tracking-normal ${textMuted}`}>
              <th className="px-5 py-3.5">Name</th>
              <th className="px-5 py-3.5">IP Address</th>
              <th className="px-5 py-3.5">Resources</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Uptime</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {droplets.length > 0 ? droplets.map((droplet) => (
              <tr key={droplet.id} className="border-t border-[#edf1f7] text-[13px]">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ServerTile droplet={droplet} small />
                    <div>
                      <p className="font-extrabold text-blue-600">{droplet.name}</p>
                      <p className={`mt-1 text-[12px] font-semibold ${textMuted}`}>{planLabel(droplet)} portal</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className={`font-mono text-[13px] font-bold ${textInk}`}>{droplet.ip}</p>
                  <p className={`mt-1 text-[12px] font-semibold ${textMuted}`}>{droplet.region}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="inline-grid grid-cols-3 divide-x divide-[#edf1f7] rounded-[8px] border border-[#edf1f7] bg-white">
                    <span className={`px-3 py-2.5 text-[12px] font-extrabold ${textInk}`}>{cpuText(droplet)}</span>
                    <span className={`px-3 py-2.5 text-[12px] font-extrabold ${textInk}`}>{ramText(droplet)}</span>
                    <span className={`px-3 py-2.5 text-[12px] font-extrabold ${textInk}`}>{storageText(droplet)}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 font-extrabold text-emerald-600">
                    <span className={`h-2 w-2 rounded-full ${isRunning(droplet) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {isRunning(droplet) ? 'Running' : 'Off'}
                  </span>
                </td>
                <td className={`px-5 py-4 font-semibold ${textMuted}`}>{uptimeLabel(droplet)}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <DropletActions
                      compact
                      actionLoading={actionLoading}
                      deleteDroplet={deleteDroplet}
                      droplet={droplet}
                      openTPanelLogin={openTPanelLogin}
                      setSelectedDroplet={setSelectedDroplet}
                      toggleStatus={toggleStatus}
                    />
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center">
                  <Server className="mx-auto mb-4 h-12 w-12 text-[#ccd5e4]" />
                  <h3 className={`font-display text-[18px] font-extrabold ${textInk}`}>No droplets found</h3>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResourceUsageCard({ droplet }: { droplet?: Droplet }) {
  const cpu = droplet ? cpuUsage(droplet) : 0;
  const ram = droplet ? ramUsage(droplet) : 0;
  const average = droplet ? Math.round((cpu + ram) / 2) : 0;

  return (
    <section className={`${cardClass} p-5`}>
      <h2 className={`mb-5 font-display text-[15px] font-extrabold ${textInk}`}>Resource Usage</h2>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="grid h-[124px] w-[124px] shrink-0 place-items-center rounded-full p-[11px]"
          style={{ background: `conic-gradient(#1b63f2 0 ${average * 0.45}%, #5b21e6 ${average * 0.45}% ${average}%, #eeeaff ${average}% 100%)` }}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-white">
            <div className="text-center">
              <p className={`font-display text-[23px] font-extrabold leading-none ${textInk}`}>{average}%</p>
              <p className={`mt-1.5 text-[12px] font-semibold ${textMuted}`}>Avg. Usage</p>
            </div>
          </div>
        </div>
        <div className="w-full flex-1 space-y-4">
          <div className="flex items-center justify-between gap-5">
            <span className="inline-flex items-center gap-3 text-[13px] font-semibold text-[#44516a]">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              CPU Usage
            </span>
            <span className={`font-display text-[14px] font-extrabold ${textInk}`}>{cpu}%</span>
          </div>
          <div className="flex items-center justify-between gap-5">
            <span className="inline-flex items-center gap-3 text-[13px] font-semibold text-[#44516a]">
              <span className="h-2 w-2 rounded-full bg-[#5b21e6]" />
              RAM Usage
            </span>
            <span className={`font-display text-[14px] font-extrabold ${textInk}`}>{ram}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniWorldMap() {
  return (
    <svg viewBox="0 0 360 180" className="h-full w-full" aria-hidden="true">
      <rect width="360" height="180" rx="8" fill="#fbfcff" />
      <g fill="#e9edf8">
        <path d="M51 63l13-11 21-3 19 8 9 15-8 15-22 2-8 13-15-2-12-15 8-10z" />
        <path d="M116 93l14 9 7 20-8 22-12 12-11-20 5-20-7-14z" />
        <path d="M154 58l21-8 27 3 16 13-11 12-22-2-18 9-16-9z" />
        <path d="M195 85l24-7 25 9 13 20-9 21-27 2-17-14-20 3-10-15z" />
        <path d="M258 73l18-11 30 2 19 11-2 17-25 3-11 14-21-8-12-13z" />
        <path d="M285 128l28 2 18 13-4 16-25 8-21-11-10-15z" />
        <path d="M132 48l14-4 9 5-7 8-14 1z" />
        <path d="M222 52l16-7 13 6-8 9-19 1z" />
      </g>
      <g stroke="#f3f6fb" strokeWidth="1">
        <path d="M0 60h360M0 100h360M0 140h360" />
        <path d="M80 0v180M160 0v180M240 0v180M320 0v180" />
      </g>
      <circle cx="241" cy="98" r="4.5" fill="#5b21e6" />
      <circle cx="241" cy="98" r="9" fill="#5b21e6" opacity="0.12" />
    </svg>
  );
}

function LocationCard({ droplets }: { droplets: Droplet[] }) {
  const location = topLocation(droplets);

  return (
    <section className={`${cardClass} p-5`}>
      <h2 className={`mb-5 font-display text-[15px] font-extrabold ${textInk}`}>Top Location</h2>
      <div className="grid min-h-[130px] grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_135px]">
        <div className="h-[124px] overflow-hidden rounded-[8px]">
          <MiniWorldMap />
        </div>
        <div>
          <p className={`font-display text-[14px] font-extrabold ${textInk}`}>{location.region}</p>
          <p className="mt-3 inline-flex rounded-[6px] bg-[#f1ecff] px-3 py-1.5 text-[12px] font-extrabold text-[#5b21e6]">
            {location.count || 0} {location.count === 1 ? 'Droplet' : 'Droplets'}
          </p>
        </div>
      </div>
    </section>
  );
}

function QuickActionsCard() {
  const actions = [
    { label: 'Create New Droplet', path: '/droplets/create', icon: Plus, bg: 'bg-[#f1ecff]', color: 'text-[#5b21e6]' },
    { label: 'View All Droplets', path: '/droplets', icon: LayoutList, bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Manage Billing', path: '/billing', icon: CreditCard, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Support Center', path: '/support', icon: Headphones, bg: 'bg-amber-50', color: 'text-amber-600' }
  ];

  return (
    <section className={`${cardClass} p-5`}>
      <h2 className={`mb-3 font-display text-[15px] font-extrabold ${textInk}`}>Quick Actions</h2>
      <div>
        {actions.map((action) => (
          <Link key={action.label} to={action.path} className="flex items-center justify-between border-b border-[#edf1f7] py-2.5 last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${action.bg} ${action.color}`}>
                <action.icon className="h-4 w-4" />
              </span>
              <span className={`truncate text-[13px] font-semibold ${textInk}`}>{action.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#7b8798]" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DropletsPage({ droplets, setDroplets }: DropletsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('all');
  const [error, setError] = useState('');
  const [selectedDroplet, setSelectedDroplet] = useState<Droplet | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const { confirmDelete } = useActionConfirmation();

  const filteredDroplets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return droplets.filter((droplet) => {
      const matchesSearch = !query || droplet.name.toLowerCase().includes(query) || droplet.ip.includes(query) || droplet.region.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || droplet.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [droplets, searchQuery, statusFilter]);

  const featuredDroplet = filteredDroplets[0] || droplets[0];

  const deleteDroplet = async (id: string) => {
    const droplet = droplets.find((item) => item.id === id);
    const confirmed = await confirmDelete({
      title: 'Delete droplet?',
      message: 'Are you sure you want to delete this droplet? All data will be lost.',
      resourceName: droplet?.name || id
    });
    if (!confirmed) return;

    try {
      await deleteDropletWithApi(id);
      setDroplets(droplets.filter((item) => item.id !== id));
    } catch {
      setError('Unable to delete droplet from the API.');
    }
  };

  const toggleStatus = async (id: string) => {
    const target = droplets.find((item) => item.id === id);
    const nextStatus = target?.status === 'active' ? 'off' : 'active';

    try {
      setActionLoading(`power:${id}`);
      const updated = await updateDropletStatusWithApi(id, nextStatus);
      setDroplets(droplets.map((item) => item.id === id ? updated : item));
      setSelectedDroplet((current) => current?.id === id ? updated : current);
    } catch {
      setError('Unable to update droplet status from the API.');
    } finally {
      setActionLoading('');
    }
  };

  const isTPanelDroplet = (droplet: Droplet) => Boolean(metadataOf(droplet).tpanelAccount || metadataOf(droplet).deploymentNode?.module === 'tpanel');
  const tPanelAccount = (droplet?: Droplet | null) => metadataOf(droplet).tpanelAccount || null;

  const openTPanelLogin = async (droplet: Droplet) => {
    try {
      setActionLoading(`login:${droplet.id}`);
      const login = await createTPanelResourceLoginWithApi(droplet.id);
      window.open(login.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open tPanel login.');
    } finally {
      setActionLoading('');
    }
  };

  const changePassword = async () => {
    if (!selectedDroplet) return;
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    try {
      setActionLoading(`password:${selectedDroplet.id}`);
      const updated = await changeTPanelResourcePasswordWithApi(selectedDroplet.id, newPassword);
      setDroplets(droplets.map((item) => item.id === selectedDroplet.id ? updated : item));
      setSelectedDroplet(updated);
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to queue password change.');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="relative -mx-3 -my-4 min-h-[calc(100vh-4rem)] bg-[#f7f9fc] px-3 py-5 sm:-mx-5 sm:px-5 md:-mx-7 md:-my-7 md:px-7 md:py-6">
      <div className="mx-auto max-w-[1168px] space-y-4">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`font-display text-[28px] font-extrabold leading-tight tracking-normal ${textInk}`}>Droplets</h1>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[7px] bg-[#f1ecff] px-2 text-[13px] font-extrabold text-[#5b21e6]">
                {droplets.length}
              </span>
            </div>
            <p className={`mt-2 text-[14px] font-medium ${textMuted}`}>Manage and monitor your cloud servers.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6d7788]" />
              <input
                type="text"
                placeholder="Search droplets..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#e8edf7] bg-white pl-11 pr-4 text-[13px] font-medium text-[#071437] outline-none transition focus:border-blue-300"
              />
            </div>
            <Link
              to="/droplets/create"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#5b21e6] to-[#3b16d4] px-5 text-[13px] font-extrabold text-white transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" /> Create Droplet
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-extrabold text-red-600">{error}</div>
        )}

        <FeaturedDropletCard
          actionLoading={actionLoading}
          deleteDroplet={deleteDroplet}
          droplet={featuredDroplet}
          openTPanelLogin={openTPanelLogin}
          setSelectedDroplet={setSelectedDroplet}
          toggleStatus={toggleStatus}
        />

        <DropletsTable
          actionLoading={actionLoading}
          deleteDroplet={deleteDroplet}
          droplets={filteredDroplets}
          openTPanelLogin={openTPanelLogin}
          setSelectedDroplet={setSelectedDroplet}
          setStatusFilter={setStatusFilter}
          statusFilter={statusFilter}
          toggleStatus={toggleStatus}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.08fr_1.08fr]">
          <ResourceUsageCard droplet={featuredDroplet} />
          <LocationCard droplets={filteredDroplets.length ? filteredDroplets : droplets} />
          <QuickActionsCard />
        </div>
      </div>

      {selectedDroplet && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-[#031b4e]/35 p-0 md:p-6" onClick={() => setSelectedDroplet(null)}>
          <section className="h-full w-full overflow-y-auto border-l border-[#e8edf7] bg-white p-6 md:h-auto md:max-h-[calc(100vh-48px)] md:max-w-xl md:rounded-[8px] md:border" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#edf1f7] pb-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#5b21e6]">Resource portal</p>
                <h2 className={`mt-1 font-display text-[22px] font-extrabold ${textInk}`}>{selectedDroplet.name}</h2>
                <p className={`mt-1 text-[13px] font-semibold ${textMuted}`}>{selectedDroplet.region}</p>
              </div>
              <button onClick={() => setSelectedDroplet(null)} className="rounded-[8px] border border-[#edf1f7] p-2 text-[#6d7788] hover:bg-[#f8faff]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
              {[
                ['Status', isRunning(selectedDroplet) ? 'Running' : 'Off'],
                ['Package', planLabel(selectedDroplet)],
                ['IPv4', selectedDroplet.ip],
                ['IPv6', metadataOf(selectedDroplet).ipv6 || 'Included on request'],
                ['CPU', cpuText(selectedDroplet)],
                ['RAM', ramText(selectedDroplet)],
                ['Disk', storageText(selectedDroplet)],
                ['Account', tPanelAccount(selectedDroplet)?.username || 'Pending']
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] border border-[#edf1f7] bg-[#fbfcff] p-3">
                  <p className={`text-[10px] font-extrabold uppercase ${textMuted}`}>{label}</p>
                  <p className={`mt-1 break-words font-extrabold ${textInk}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {isTPanelDroplet(selectedDroplet) && (
                <button
                  onClick={() => openTPanelLogin(selectedDroplet)}
                  className="flex items-center justify-center gap-2 rounded-[8px] bg-[#5b21e6] px-4 py-3 text-[13px] font-extrabold text-white hover:bg-[#4b18c8]"
                >
                  <ExternalLink className="h-4 w-4" /> tPanel Login
                </button>
              )}
              <button
                onClick={() => toggleStatus(selectedDroplet.id)}
                disabled={actionLoading === `power:${selectedDroplet.id}`}
                className="flex items-center justify-center gap-2 rounded-[8px] border border-[#edf1f7] px-4 py-3 text-[13px] font-extrabold text-[#071437] hover:bg-[#f8faff] disabled:opacity-60"
              >
                <Power className="h-4 w-4" /> {isRunning(selectedDroplet) ? 'Turn Off Account' : 'Turn On Account'}
              </button>
            </div>

            {isTPanelDroplet(selectedDroplet) && (
              <div className="mt-5 rounded-[8px] border border-[#edf1f7] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#5b21e6]" />
                  <h3 className={`text-[13px] font-extrabold uppercase ${textInk}`}>Change tPanel password</h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password"
                    className="h-11 flex-1 rounded-[8px] border border-[#edf1f7] px-3 text-sm outline-none focus:border-blue-300"
                  />
                  <button
                    onClick={changePassword}
                    disabled={actionLoading === `password:${selectedDroplet.id}`}
                    className="rounded-[8px] bg-[#071437] px-4 py-2 text-[12px] font-extrabold text-white hover:bg-[#101d3f] disabled:opacity-60"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
