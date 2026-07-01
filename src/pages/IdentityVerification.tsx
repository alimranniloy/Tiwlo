import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  FileCheck2,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
  Upload
} from 'lucide-react';
import { User } from '../types';
import {
  fetchIdentityVerificationChallengeWithApi,
  startIdentityVerificationWithApi,
  submitIdentityVerificationWithApi
} from '../lib/tiwloApi';

type Props = {
  user: User;
  onLogout?: () => void;
};

type CaptureItem = {
  file: File;
  dataUrl: string;
  captured: boolean;
};

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints || 0;
  return /android|iphone|ipad|ipod|mobile|windows phone/i.test(ua) || (touch > 1 && /macintosh/i.test(ua));
};

const imageToDataUrl = (file: File): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.onload = () => {
      const raw = String(reader.result || '');
      const image = new Image();
      image.onerror = () => resolve(raw);
      image.onload = () => {
        const maxSide = 1400;
        const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(raw);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = raw;
    };
    reader.readAsDataURL(file);
  })
);

const documentLabel = (kind: string) => {
  if (kind === 'id_card') return 'ID card';
  if (kind === 'bank_statement') return 'Bank statement';
  if (kind === 'license') return 'License';
  return kind.replace(/_/g, ' ');
};

export default function IdentityVerification({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;
  const flow = searchParams.get('flow') || undefined;
  const [loading, setLoading] = React.useState(true);
  const [challenge, setChallenge] = React.useState<any | null>(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [step, setStep] = React.useState(0);
  const [documents, setDocuments] = React.useState<Record<string, CaptureItem>>({});
  const [selfie, setSelfie] = React.useState<CaptureItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [qr, setQr] = React.useState('');
  const [cameraLabel, setCameraLabel] = React.useState('');
  const startedRef = React.useRef(false);
  const mobile = isMobileDevice();

  const loadChallenge = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let data = await fetchIdentityVerificationChallengeWithApi(flow, token);
      if (!data?.request && flow === 'tiwlo_pay' && !startedRef.current) {
        startedRef.current = true;
        await startIdentityVerificationWithApi({ flow: 'tiwlo_pay', source: 'tiwlo-pay', ownerId: user.id });
        data = await fetchIdentityVerificationChallengeWithApi(flow, token);
      }
      setChallenge(data);
      if (data?.request?.status === 'pending') setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load verification request');
    } finally {
      setLoading(false);
    }
  }, [flow, token, user.id]);

  React.useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  React.useEffect(() => {
    const link = challenge?.mobileLink || challenge?.request?.mobileLink || window.location.href;
    if (!mobile && link) {
      QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#111827', light: '#ffffff' } })
        .then(setQr)
        .catch(() => setQr(''));
    }
  }, [challenge, mobile]);

  const request = challenge?.request;
  const requirement = request?.requirement || {};
  const requiredDocs = Array.isArray(requirement.documents) ? requirement.documents : [];
  const submitted = request?.status === 'pending';
  const approved = request?.status === 'approved';
  const rejected = request?.status === 'rejected';

  const captureFile = async (kind: string, file?: File | null) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await imageToDataUrl(file);
      setDocuments((current) => ({ ...current, [kind]: { file, dataUrl, captured: true } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to capture image');
    }
  };

  const captureSelfie = async (file?: File | null) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await imageToDataUrl(file);
      setSelfie({ file, dataUrl, captured: true });
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const camera = devices.find((item) => item.kind === 'videoinput' && /front|user|camera/i.test(item.label || '')) || devices.find((item) => item.kind === 'videoinput');
        setCameraLabel(camera?.label || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to capture selfie');
    }
  };

  const submit = async () => {
    if (!request || saving) return;
    setSaving(true);
    setError('');
    try {
      const docs = requiredDocs.map((item: any) => {
        const capture = documents[item.kind];
        if (!capture) throw new Error(`${documentLabel(item.kind)} is required`);
        return {
          kind: item.kind,
          name: capture.file.name || item.kind,
          type: capture.file.type || 'image/jpeg',
          dataUrl: capture.dataUrl,
          captured: capture.captured
        };
      });
      if (!selfie) throw new Error('Live selfie is required');
      const result = await submitIdentityVerificationWithApi({
        requestId: request.id,
        documents: docs,
        selfie: {
          kind: 'selfie',
          name: selfie.file.name || 'selfie',
          type: selfie.file.type || 'image/jpeg',
          dataUrl: selfie.dataUrl,
          captured: true
        },
        device: {
          userAgent: navigator.userAgent,
          hasTouch: navigator.maxTouchPoints > 0,
          cameraLabel,
          screen: {
            width: window.screen.width,
            height: window.screen.height,
            pixelRatio: window.devicePixelRatio || 1
          }
        }
      });
      setNotice(result.message || 'ID verification submitted');
      setChallenge((current: any) => ({ ...(current || {}), request: result.request }));
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit verification');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    const link = challenge?.mobileLink || request?.mobileLink || window.location.href;
    await navigator.clipboard?.writeText(link).catch(() => null);
    setNotice('Verification link copied');
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-[#111827]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0069ff]" />
      </main>
    );
  }

  if (!request) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-5 text-[#111827]">
        <section className="w-full max-w-md rounded-md border border-[#E5E7EB] p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#0069ff]" />
          <h1 className="mt-4 text-2xl font-bold">Tiwlo</h1>
          <p className="mt-2 text-sm font-medium text-[#4B5563]">{challenge?.rejectedReason || error || 'No active verification request was found.'}</p>
          <button onClick={() => navigate('/')} className="mt-5 rounded-md bg-[#0069ff] px-4 py-2 text-sm font-bold text-white">Back to Tiwlo</button>
        </section>
      </main>
    );
  }

  if (!mobile && !approved && !submitted) {
    const link = challenge?.mobileLink || request.mobileLink || window.location.href;
    return (
      <main className="min-h-screen bg-white px-5 py-8 text-[#111827]">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg flex-col justify-center rounded-md border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="rounded-md border border-[#E5E7EB] p-2 text-[#4B5563]"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-lg font-black">Tiwlo</span>
            {onLogout ? <button onClick={onLogout} className="rounded-md border border-[#E5E7EB] p-2 text-[#4B5563]"><LogOut className="h-4 w-4" /></button> : <span className="h-9 w-9" />}
          </div>
          <div className="mt-10 text-center">
            <Smartphone className="mx-auto h-12 w-12 text-[#0069ff]" />
            <h1 className="mt-5 text-2xl font-bold">Continue on mobile</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-[#4B5563]">Scan the QR code from your phone to complete the camera verification.</p>
            <div className="mx-auto mt-6 flex h-60 w-60 items-center justify-center rounded-md border border-[#E5E7EB] bg-white">
              {qr ? <img src={qr} alt="Verification QR code" className="h-56 w-56" draggable={false} /> : <Loader2 className="h-5 w-5 animate-spin text-[#0069ff]" />}
            </div>
            <button onClick={copyLink} className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-[#DDE3EA] px-4 py-2.5 text-sm font-bold text-[#111827]">
              <Copy className="h-4 w-4" /> Copy link
            </button>
            <p className="mt-4 break-all text-xs font-medium text-[#6B7280]">{link}</p>
          </div>
        </section>
      </main>
    );
  }

  const allDocsReady = requiredDocs.every((item: any) => Boolean(documents[item.kind]));

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-5">
        <header className="flex items-center justify-between">
          <button onClick={() => step > 0 && step < 3 ? setStep((current) => current - 1) : navigate(-1)} className="rounded-md border border-[#E5E7EB] p-2 text-[#4B5563]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-lg font-black">Tiwlo</p>
            <p className="text-[11px] font-bold uppercase text-[#0069ff]">{request.flow === 'tiwlo_pay' ? 'Pay verification' : 'ID verification'}</p>
          </div>
          {onLogout ? <button onClick={onLogout} className="rounded-md border border-[#E5E7EB] p-2 text-[#4B5563]"><LogOut className="h-4 w-4" /></button> : <span className="h-9 w-9" />}
        </header>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className={`h-1.5 rounded-full ${step >= item ? 'bg-[#0069ff]' : 'bg-[#E5E7EB]'}`} />
          ))}
        </div>

        {(error || notice || rejected) && (
          <div className={`mt-5 rounded-md border px-4 py-3 text-sm font-bold ${error || rejected ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
            {error || (rejected ? request.review?.reason || 'Your ID was not verified. Try again.' : notice)}
          </div>
        )}

        {step === 0 && !submitted && !approved && (
          <div className="flex flex-1 flex-col justify-between py-8">
            <div>
              <ShieldCheck className="h-12 w-12 text-[#0069ff]" />
              <h1 className="mt-6 text-3xl font-black leading-tight">Verify your identity</h1>
              <div className="mt-7 space-y-5">
                {[
                  ['1', 'Capture document', `${requiredDocs.length} item${requiredDocs.length === 1 ? '' : 's'}`],
                  ['2', 'Take a selfie', 'Live camera'],
                  ['3', 'Submit for review', 'Tiwlo Team approval']
                ].map(([number, label, detail]) => (
                  <div key={number} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111827] text-sm font-black text-white">{number}</span>
                    <div>
                      <p className="text-base font-black">{label}</p>
                      <p className="mt-1 text-sm font-medium text-[#6B7280]">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setStep(1)} className="mt-8 rounded-md bg-[#0069ff] px-5 py-4 text-base font-black text-white">
              Begin verification
            </button>
          </div>
        )}

        {step === 1 && !submitted && !approved && (
          <div className="flex flex-1 flex-col py-8">
            <h1 className="text-2xl font-black">Capture ID</h1>
            <div className="mt-6 space-y-4">
              {requiredDocs.map((item: any) => {
                const current = documents[item.kind];
                return (
                  <label key={item.kind} className="block rounded-md border border-[#DDE3EA] p-4">
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => captureFile(item.kind, event.target.files?.[0])} />
                    <div className="flex items-center gap-4">
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${current ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#0069ff]'}`}>
                        {current ? <CheckCircle2 className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black">{documentLabel(item.kind)}</p>
                        <p className="mt-1 truncate text-xs font-medium text-[#6B7280]">{current?.file.name || 'Tap to capture'}</p>
                      </div>
                      <Upload className="h-4 w-4 text-[#9CA3AF]" />
                    </div>
                  </label>
                );
              })}
            </div>
            <button disabled={!allDocsReady} onClick={() => setStep(2)} className="mt-auto rounded-md bg-[#0069ff] px-5 py-4 text-base font-black text-white disabled:opacity-40">
              Continue
            </button>
          </div>
        )}

        {step === 2 && !submitted && !approved && (
          <div className="flex flex-1 flex-col py-8">
            <h1 className="text-2xl font-black">Live selfie</h1>
            <label className="mt-6 flex aspect-square flex-col items-center justify-center rounded-full border-4 border-dashed border-[#22C55E] bg-[#F8FAFC] text-center">
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={(event) => captureSelfie(event.target.files?.[0])} />
              {selfie ? (
                <>
                  <img src={selfie.dataUrl} alt="Selfie preview" className="h-full w-full rounded-full object-cover" draggable={false} />
                </>
              ) : (
                <>
                  <Camera className="h-12 w-12 text-[#0069ff]" />
                  <p className="mt-3 text-sm font-black">Open camera</p>
                </>
              )}
            </label>
            <button disabled={!selfie || saving} onClick={submit} className="mt-auto flex items-center justify-center gap-2 rounded-md bg-[#0069ff] px-5 py-4 text-base font-black text-white disabled:opacity-40">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileCheck2 className="h-5 w-5" />}
              Submit verification
            </button>
          </div>
        )}

        {(step === 3 || submitted || approved) && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className={`h-16 w-16 ${approved ? 'text-emerald-600' : 'text-[#0069ff]'}`} />
            <h1 className="mt-6 text-3xl font-black">{approved ? 'Verified' : 'Submitted'}</h1>
            <p className="mt-3 max-w-xs text-sm font-medium leading-6 text-[#4B5563]">
              {approved ? 'Your identity verification is approved.' : 'Your documents are waiting for Tiwlo Team review.'}
            </p>
            <button onClick={() => navigate(request.flow === 'tiwlo_pay' ? '/tiwlo-pay' : '/')} className="mt-8 rounded-md bg-[#0069ff] px-5 py-3 text-sm font-black text-white">
              Done
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
