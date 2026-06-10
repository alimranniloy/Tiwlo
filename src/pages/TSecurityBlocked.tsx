import { Link } from 'react-router-dom';
import { LifeBuoy, LogOut } from 'lucide-react';
import SystemStatusPage from '../components/SystemStatusPage';
import { clearAuthToken } from '../lib/tiwloApi';
import { clearTSecurityClientState } from '../../tSecurity/client/tSecurityClient';

export default function TSecurityBlocked() {
  const signOut = () => {
    clearAuthToken();
    clearTSecurityClientState();
    localStorage.removeItem('tiwlo_user');
    sessionStorage.removeItem('tiwlo_signup_draft_v2');
    window.location.replace('/login');
  };

  return (
    <SystemStatusPage variant="disabled" title="Access Blocked | Tiwlo">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dfe5ee] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111827] hover:bg-[#f8fafc]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
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
