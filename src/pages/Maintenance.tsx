import SystemStatusPage from '../components/SystemStatusPage';
import { User } from '../types';

type MaintenancePageProps = {
  user?: User | null;
  loginHref?: string;
  onLogout?: () => void;
};

export default function MaintenancePage({ user, loginHref = '/login', onLogout }: MaintenancePageProps) {
  const loginAction = user ? (
    <button
      onClick={() => {
        onLogout?.();
        window.location.href = loginHref;
      }}
      className="rounded-md border border-[#111827] bg-[#111827] px-4 py-2 text-[13px] font-bold text-white"
    >
      Admin Login
    </button>
  ) : (
    <a
      href={loginHref}
      className="rounded-md border border-[#111827] bg-[#111827] px-4 py-2 text-[13px] font-bold text-white"
    >
      Login
    </a>
  );

  return (
    <SystemStatusPage variant="maintenance" title="Maintenance | Tiwlo" topAction={loginAction}>
      <p className="text-[13px] font-bold text-[#4b5563]">Maintenance mode is active.</p>
    </SystemStatusPage>
  );
}
