import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LifeBuoy } from 'lucide-react';
import SystemStatusPage from '../components/SystemStatusPage';
import { getStoredTSecurityBlockReason } from '../../tSecurity/client/tSecurityClient';

export default function TSecurityBlocked() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || getStoredTSecurityBlockReason() || 'Security Check Failed';

  return (
    <SystemStatusPage variant="disabled" title="Access Blocked | Tiwlo">
      <div className="space-y-4">
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-wide text-red-500">tSecurity block reason</p>
          <p className="mt-1 text-[13px] font-bold text-red-700">{reason}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dfe5ee] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111827] hover:bg-[#f8fafc]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
          <Link
            to="/support"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#111827] bg-[#111827] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-black"
          >
            <LifeBuoy className="h-4 w-4" />
            Contact Support
          </Link>
        </div>
      </div>
    </SystemStatusPage>
  );
}
