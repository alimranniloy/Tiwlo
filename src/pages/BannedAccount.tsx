import React from 'react';
import { Download, LifeBuoy, LogOut } from 'lucide-react';
import SystemStatusPage from '../components/SystemStatusPage';
import { fetchIdentityVerificationChallengeWithApi } from '../lib/tiwloApi';
import { User } from '../types';

interface BannedAccountProps {
  user: User;
  onLogout: () => void;
}

function supportMessage(user: User) {
  return [
    'Restricted account support request.',
    `Label: disable account`,
    `Account: ${user.email}`,
    `Status: ${user.status || 'restricted'}`,
    `User ID: ${user.id}`
  ].join('\n');
}

export default function BannedAccount({ user, onLogout }: BannedAccountProps) {
  const [verificationMessage, setVerificationMessage] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const checkVerification = async () => {
      try {
        const challenge = await fetchIdentityVerificationChallengeWithApi('account_recovery');
        if (!active) return;
        if (challenge?.request?.id && ['requested', 'pending'].includes(String(challenge.request.status || '').toLowerCase())) {
          window.location.assign(`/id-verification?token=${encodeURIComponent(challenge.request.token)}`);
          return;
        }
        setVerificationMessage(challenge?.rejectedReason ? `Your ID was not verified. ${challenge.rejectedReason}` : '');
      } catch {
        if (active) setVerificationMessage('');
      }
    };
    checkVerification();
    const timer = window.setInterval(checkVerification, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user.id]);

  const openSupport = () => {
    const emit = () => {
      window.dispatchEvent(new CustomEvent('tiwlo:open-chat', {
        detail: {
          autoStart: true,
          requestedAgent: true,
          openedFrom: 'restricted-account-page',
          subject: 'Disabled account support',
          priority: 'high',
          initialMessage: supportMessage(user),
          metadata: {
            source: 'restricted-account-page',
            label: 'disable account',
            caseLabel: 'disable account',
            accountStatus: user.status || 'restricted',
            accountEmail: user.email,
            accountUserId: user.id
          }
        }
      }));
    };
    emit();
    window.setTimeout(emit, 150);
  };

  const downloadInformation = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account: user }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tiwlo-account-information.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SystemStatusPage variant="disabled" title="Account Disabled | Tiwlo">
      {verificationMessage && (
        <div className="mx-auto mb-4 max-w-lg rounded-md border border-red-100 bg-red-50 px-4 py-3 text-center text-[13px] font-bold text-red-700">
          {verificationMessage}
        </div>
      )}
      <p className="mb-4 text-[13px] font-semibold leading-6 text-[#64748b]">
        Contact support within 180 days to request a review. After that, your account and stored information may be permanently removed.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={downloadInformation}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dfe5ee] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111827] hover:bg-[#f8fafc]"
        >
          <Download className="h-4 w-4" />
          Download your information
        </button>
        <button
          onClick={openSupport}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dfe5ee] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111827] hover:bg-[#f8fafc]"
        >
          <LifeBuoy className="h-4 w-4" />
          Contact Support
        </button>
        <button
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#111827] bg-[#111827] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-black"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </SystemStatusPage>
  );
}
