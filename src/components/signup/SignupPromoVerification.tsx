import { SignupAuthError } from './SignupAuthBits';
import { providerLabel, providerOf, signupPromoPaymentLogos } from './signupPromoUtils';

type Props = {
  gateways: any[];
  gatewaysLoading?: boolean;
  selectedGateway: string;
  isLoading?: boolean;
  error?: string;
  topActionLabel: string;
  verifyLabel?: string;
  loadingLabel?: string;
  skipLabel?: string;
  onTopAction: () => void;
  onSelectGateway: (provider: string) => void;
  onVerify: () => void;
  onSkip: () => void;
};

export default function SignupPromoVerification({
  gateways,
  gatewaysLoading = false,
  selectedGateway,
  isLoading = false,
  error = '',
  topActionLabel,
  verifyLabel = 'Verify and get $100',
  loadingLabel = 'Starting...',
  skipLabel = 'No, just sign up',
  onTopAction,
  onSelectGateway,
  onVerify,
  onSkip
}: Props) {
  return (
    <main className="min-h-[100svh] bg-[#f8faff] px-4 py-3 font-sans text-black sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-[420px] flex-col justify-center">
        <section className="w-full">
          <button type="button" onClick={onTopAction} className="inline-flex h-8 items-center rounded-full border border-[#e3e8f3] bg-white px-3 text-[13px] font-bold text-[#0f172a]">
            {topActionLabel}
          </button>

          <div className="mt-4">
            <div className="inline-flex rounded-full bg-[#eef3ff] px-3 py-1 text-[11px] font-black uppercase tracking-normal text-[#3568de]">
              Free credit
            </div>
            <h1 className="mt-2 text-[25px] font-black leading-[1.05] tracking-normal text-[#071024]">Verify payment method</h1>
            <p className="mt-2 text-[14px] font-medium leading-5 text-[#445163]">
              Unlock your $100 credit for 30 days.
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-[#e6ebf4] bg-white">
            {[
              '$1 hold is returned after verification.',
              '$100 credit lasts 30 days.',
              'After credit ends, services need active credit.'
            ].map((text, index) => (
              <div key={text} className={`px-4 py-3 ${index < 2 ? 'border-b border-[#edf1f6]' : ''}`}>
                <p className="text-[13px] font-bold leading-5 text-[#0f172a]">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[14px] font-black text-[#0f172a]">Choose payment method</p>
              {gatewaysLoading && <span className="text-[11px] font-semibold text-[#7b8794]">Loading...</span>}
            </div>
            <div className="grid gap-2">
              {gateways.map((gateway) => {
                const provider = providerOf(gateway);
                const active = selectedGateway === provider;
                const logo = signupPromoPaymentLogos[provider];
                return (
                  <button
                    key={gateway.id || provider}
                    type="button"
                    onClick={() => onSelectGateway(provider)}
                    className={`grid min-h-[52px] grid-cols-[26px_42px_1fr] items-center gap-2.5 rounded-[16px] border bg-white px-3 text-left transition ${
                      active ? 'border-[#5e8cff] bg-[#f8fbff]' : 'border-[#e5e8ef] hover:border-[#b9cdf8]'
                    }`}
                  >
                    <span className={`grid h-[20px] w-[20px] place-items-center rounded-full border-2 ${active ? 'border-[#2563ff]' : 'border-[#d7dde8]'}`}>
                      {active && <span className="h-[8px] w-[8px] rounded-full bg-[#2563ff]" />}
                    </span>
                    <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white">
                      {logo ? (
                        <img src={logo} alt={`${providerLabel(gateway)} logo`} className={`${provider === 'stripe' ? 'h-8 w-8 rounded-[8px]' : 'h-8 w-8'} object-contain`} />
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef2ff] text-[14px] font-black text-[#2563ff]">{providerLabel(gateway).charAt(0)}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-[16px] font-black leading-5 text-[#0f172a]">{providerLabel(gateway)}</span>
                        {provider === 'bkash' && <span className="rounded-full bg-[#f0ecff] px-2 py-0.5 text-[10px] font-black text-[#5d3fd3]">Recommended</span>}
                      </span>
                      <span className="block truncate text-[11px] font-bold uppercase tracking-normal text-[#4b5563]">{provider}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="mt-4"><SignupAuthError message={error} /></div>}

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              disabled={isLoading || !selectedGateway}
              onClick={onVerify}
              className="h-12 w-full rounded-[18px] bg-[#3e22e8] px-4 text-[16px] font-black text-white transition hover:bg-[#2d18c6] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isLoading ? loadingLabel : verifyLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onSkip}
              className="h-11 w-full rounded-[18px] border border-[#d9dce7] bg-white px-4 text-[14px] font-black text-[#3e22e8] transition hover:border-[#3e22e8] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {skipLabel}
            </button>
          </div>

          <div className="mt-3 text-center text-[12px] font-semibold text-[#7b8794]">
            <span>Your payment is <span className="text-[#3568de]">secure and encrypted</span></span>
          </div>
        </section>
      </div>
    </main>
  );
}
