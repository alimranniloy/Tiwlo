import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileSearch,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
  XCircle
} from 'lucide-react';
import {
  fetchIdentityVerificationsWithApi,
  reviewIdentityVerificationWithApi
} from '../../lib/tiwloApi';

const statusPill = (status: string) => {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (value === 'rejected') return 'border-red-100 bg-red-50 text-red-700';
  if (value === 'pending') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
};

const timeLabel = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const docLabel = (kind = '') => {
  if (kind === 'id_card') return 'ID card';
  if (kind === 'bank_statement') return 'Bank statement';
  if (kind === 'license') return 'License';
  if (kind === 'selfie') return 'Live selfie';
  return String(kind || 'Document').replace(/_/g, ' ');
};

export default function AdminIdentityVerification() {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [status, setStatus] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const deepLinkId = searchParams.get('id');

  const load = React.useCallback(() => {
    setLoading(true);
    setError('');
    fetchIdentityVerificationsWithApi(status || undefined)
      .then((items) => {
        setRecords(items);
        const next = (deepLinkId && items.find((item: any) => item.id === deepLinkId)) || selected && items.find((item: any) => item.id === selected.id) || items[0] || null;
        setSelected(next);
      })
      .catch((err) => {
        setRecords([]);
        setSelected(null);
        setError(err instanceof Error ? err.message : 'Unable to load identity verifications');
      })
      .finally(() => setLoading(false));
  }, [deepLinkId, selected?.id, status]);

  React.useEffect(() => {
    load();
  }, [load]);

  const review = async (nextStatus: 'approved' | 'rejected') => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const updated = await reviewIdentityVerificationWithApi(
        selected.id,
        nextStatus,
        nextStatus === 'approved' ? 'Verified by administrator.' : 'Your ID was not verified. Try again.'
      );
      setSelected(updated);
      setRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to review verification');
    } finally {
      setSaving(false);
    }
  };

  const docs = Array.isArray(selected?.payload?.documents) ? selected.payload.documents : [];
  const selfie = selected?.payload?.selfie;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">ID Verification Reviews</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Private document and selfie review queue for disabled accounts and Tiwlo Pay.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border border-[#e5e8ed] bg-white px-3 py-2 text-[13px] font-bold text-[#4a4a4a]">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="requested">Requested</option>
          </select>
          <button onClick={load} className="flex items-center gap-2 rounded border border-[#e5e8ed] bg-white px-4 py-2 text-[13px] font-bold text-[#4a4a4a] hover:bg-gray-50">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.4fr]">
        <section className="overflow-hidden rounded-md border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] px-5 py-4">
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">Queue</h2>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm font-bold text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">No verification records found.</div>
            ) : records.map((item) => (
              <button key={item.id} onClick={() => setSelected(item)} className={`block w-full border-b border-[#f3f5f9] px-5 py-4 text-left hover:bg-[#f8fafc] ${selected?.id === item.id ? 'bg-blue-50/60' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#111827]">{item.owner?.name || item.owner?.email || item.ownerId}</p>
                    <p className="mt-1 text-xs font-bold text-[#6B7280]">{item.flow === 'tiwlo_pay' ? 'Tiwlo Pay' : 'Disabled account'} · {timeLabel(item.updatedAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-black uppercase ${statusPill(item.status)}`}>{item.status}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#e5e8ed] bg-white">
          {!selected ? (
            <div className="flex h-[520px] items-center justify-center text-sm font-bold text-gray-400">Select a verification record.</div>
          ) : (
            <>
              <div className="flex flex-col gap-4 border-b border-[#f3f5f9] px-5 py-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${statusPill(selected.status)}`}>{selected.status}</span>
                    <span className="font-mono text-[11px] text-gray-400">{selected.id}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#2e3d49]">{selected.owner?.name || selected.owner?.email || 'Customer'}</h2>
                  <p className="mt-1 text-[12px] font-medium text-[#4a4a4a]">{selected.owner?.email || selected.ownerId} · {selected.flow}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={saving || selected.status === 'approved'} onClick={() => review('approved')} className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </button>
                  <button disabled={saving || selected.status === 'rejected'} onClick={() => review('rejected')} className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50">
                    <XCircle className="h-4 w-4" /> Not verified
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                {[
                  { label: 'Submitted', value: timeLabel(selected.submittedAt), icon: Clock3 },
                  { label: 'Reviewed', value: timeLabel(selected.reviewedAt), icon: UserCheck },
                  { label: 'Source', value: selected.source || 'system', icon: ShieldCheck }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded border border-[#E5E7EB] p-3">
                      <Icon className="h-4 w-4 text-[#0069ff]" />
                      <p className="mt-2 text-[10px] font-black uppercase text-gray-400">{item.label}</p>
                      <p className="mt-1 truncate text-xs font-bold text-[#111827]">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-2">
                {[...docs, selfie].filter(Boolean).map((item: any) => (
                  <div key={item.kind} className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileSearch className="h-4 w-4 text-[#0069ff]" />
                        <span className="text-sm font-black text-[#111827]">{docLabel(item.kind)}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-[#6B7280]">{item.captured ? 'captured' : 'uploaded'}</span>
                    </div>
                    {item.dataUrl ? (
                      <img src={item.dataUrl} alt={docLabel(item.kind)} className="h-72 w-full rounded object-contain [user-select:none]" draggable={false} />
                    ) : (
                      <div className="flex h-72 items-center justify-center rounded border border-dashed border-[#CBD5E1] text-sm font-bold text-gray-400">No preview</div>
                    )}
                  </div>
                ))}
              </div>

              {selected.review?.reason && (
                <div className="mx-5 mb-5 rounded border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-bold text-[#374151]">
                  {selected.review.reason}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
