import { LifeBuoy, LogOut } from 'lucide-react';
import SystemStatusPage from '../components/SystemStatusPage';
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

  return (
    <SystemStatusPage variant="disabled" title="Account Disabled | Tiwlo">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
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
