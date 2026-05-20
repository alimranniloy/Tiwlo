import React from 'react';
import { AlertTriangle, Edit3, Loader2, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { verifyCurrentPasswordWithApi } from '../lib/tiwloApi';

type ConfirmationIntent = 'delete' | 'edit' | 'default';

type ConfirmationRequest = {
  intent: ConfirmationIntent;
  title: string;
  message: string;
  resourceName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  passwordRequired?: boolean;
};

type PendingConfirmation = ConfirmationRequest & {
  resolve: (value: boolean) => void;
};

type ActionConfirmationContextValue = {
  confirmAction: (request: ConfirmationRequest) => Promise<boolean>;
  confirmDelete: (request: Omit<ConfirmationRequest, 'intent' | 'passwordRequired'>) => Promise<boolean>;
  confirmEdit: (request: Omit<ConfirmationRequest, 'intent' | 'passwordRequired'>) => Promise<boolean>;
};

const ActionConfirmationContext = React.createContext<ActionConfirmationContextValue | null>(null);

export function ActionConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirmation | null>(null);
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [checking, setChecking] = React.useState(false);
  const passwordInputRef = React.useRef<HTMLInputElement | null>(null);
  const pendingRef = React.useRef<PendingConfirmation | null>(null);

  const close = React.useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    setPassword('');
    setError('');
    setChecking(false);
    current?.resolve(confirmed);
  }, []);

  const confirmAction = React.useCallback((request: ConfirmationRequest) => new Promise<boolean>((resolve) => {
    const next = { ...request, resolve };
    pendingRef.current = next;
    setPending(next);
    setPassword('');
    setError('');
  }), []);

  const value = React.useMemo<ActionConfirmationContextValue>(() => ({
    confirmAction,
    confirmDelete: (request) => confirmAction({
      ...request,
      intent: 'delete',
      passwordRequired: true,
      confirmLabel: request.confirmLabel || 'Delete permanently'
    }),
    confirmEdit: (request) => confirmAction({
      ...request,
      intent: 'edit',
      passwordRequired: false,
      confirmLabel: request.confirmLabel || 'OK, edit'
    })
  }), [confirmAction]);

  React.useEffect(() => {
    if (pending?.passwordRequired) {
      window.setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [pending?.passwordRequired]);

  React.useEffect(() => {
    if (!pending) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, pending]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;

    if (!pending.passwordRequired) {
      close(true);
      return;
    }

    if (!password.trim()) {
      setError('Enter your account password to continue.');
      return;
    }

    setChecking(true);
    setError('');
    try {
      await verifyCurrentPasswordWithApi(password);
      close(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password verification failed.');
      setChecking(false);
    }
  };

  const isDelete = pending?.intent === 'delete';
  const Icon = isDelete ? AlertTriangle : pending?.intent === 'edit' ? Edit3 : ShieldCheck;

  return (
    <ActionConfirmationContext.Provider value={value}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                  isDelete ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {isDelete ? 'Password Required' : 'Confirm Edit'}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">{pending.title}</h2>
                </div>
              </div>
              <button type="button" onClick={() => close(false)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-sm leading-6 text-slate-600">{pending.message}</p>

              {pending.resourceName && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected item</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">{pending.resourceName}</p>
                </div>
              )}

              {pending.passwordRequired && (
                <label className="block space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Account password</span>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={passwordInputRef}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      placeholder="Enter password"
                    />
                  </div>
                </label>
              )}

              {error && (
                <div className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" onClick={() => close(false)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                {pending.cancelLabel || 'Cancel'}
              </button>
              <button
                disabled={checking}
                className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${
                  isDelete ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                {checking ? 'Verifying...' : pending.confirmLabel || 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </ActionConfirmationContext.Provider>
  );
}

export function useActionConfirmation() {
  const context = React.useContext(ActionConfirmationContext);
  if (!context) {
    throw new Error('useActionConfirmation must be used inside ActionConfirmationProvider');
  }
  return context;
}
