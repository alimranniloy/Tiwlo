import crypto from 'node:crypto';

const ACTIVE_STATUSES = ['requested', 'pending'];
const FINAL_STATUSES = ['approved', 'rejected'];
const MOBILE_UA_PATTERN = /android|iphone|ipad|ipod|mobile|windows phone/i;
const VIRTUAL_CAMERA_PATTERN = /obs|virtual|manycam|snap camera|xsplit|splitcam|altercam|webcammax/i;

const clean = (value, fallback = '') => String(value || fallback || '').trim();

export const normalizeIdentityFlow = (flow = 'account_recovery') => {
  const value = clean(flow, 'account_recovery').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  return value === 'tiwlo_pay' ? 'tiwlo_pay' : 'account_recovery';
};

export const isMobileUserAgent = (value = '') => MOBILE_UA_PATTERN.test(String(value || ''));

export const hasVirtualCameraSignal = (value = '') => VIRTUAL_CAMERA_PATTERN.test(String(value || '').toLowerCase());

export const identityVerificationRequirement = (flow = 'account_recovery') => {
  const normalized = normalizeIdentityFlow(flow);
  if (normalized === 'tiwlo_pay') {
    return {
      flow: normalized,
      title: 'Tiwlo Pay verification',
      documents: [
        { kind: 'id_card', label: 'ID card', capture: 'environment', required: true },
        { kind: 'license', label: 'License', capture: 'environment', required: true },
        { kind: 'bank_statement', label: 'Bank statement', capture: 'environment', required: true }
      ],
      selfie: { kind: 'selfie', label: 'Live selfie', capture: 'user', required: true },
      mobileOnly: true
    };
  }

  return {
    flow: normalized,
    title: 'Account recovery verification',
    documents: [
      { kind: 'id_card', label: 'ID card', capture: 'environment', required: true }
    ],
    selfie: { kind: 'selfie', label: 'Live selfie', capture: 'user', required: true },
    mobileOnly: true
  };
};

const isLocalOrigin = (value = '') => /\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/|$)/i.test(String(value || ''));

const normalizeOrigin = (value = '') => {
  const text = clean(value).replace(/\/+$/, '');
  if (!text || isLocalOrigin(text)) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

export const identityAppOrigin = () => (
  normalizeOrigin(process.env.FRONTEND_ORIGIN)
  || normalizeOrigin(process.env.PUBLIC_APP_URL)
  || normalizeOrigin(process.env.CLIENT_URL)
  || normalizeOrigin(process.env.APP_URL)
  || 'https://tiwlo.com'
);

export const identityAppOriginFor = async (prisma) => {
  const envOrigin = normalizeOrigin(process.env.FRONTEND_ORIGIN)
    || normalizeOrigin(process.env.PUBLIC_APP_URL)
    || normalizeOrigin(process.env.CLIENT_URL)
    || normalizeOrigin(process.env.APP_URL);
  if (envOrigin) return envOrigin;
  const setting = await prisma?.systemSetting?.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'powerDnsConfig' } }
  }).catch(() => null);
  const domain = normalizeOrigin(setting?.value?.primaryDomain || process.env.TIWLO_DOMAIN || process.env.APP_DOMAIN);
  return domain || 'https://tiwlo.com';
};

export const identityAppBrandFor = async (prisma) => {
  const [systemEmail, branding] = await Promise.all([
    prisma?.systemSetting?.findUnique({
      where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'systemEmail' } }
    }).catch(() => null),
    prisma?.systemSetting?.findUnique({
      where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'branding' } }
    }).catch(() => null)
  ]);
  const brand = clean(
    systemEmail?.value?.fromName
    || systemEmail?.value?.brandName
    || branding?.value?.siteName
    || branding?.value?.appName
    || branding?.value?.brandName
    || branding?.value?.name
  );
  if (brand) return brand;
  const origin = await identityAppOriginFor(prisma);
  return origin.replace(/^https?:\/\//i, '');
};

export const identityVerificationLink = (request, origin = identityAppOrigin()) => {
  const token = encodeURIComponent(String(request?.token || ''));
  return `${normalizeOrigin(origin) || identityAppOrigin()}/id-verification?token=${token}`;
};

export const identityVerificationInclude = {
  owner: true
};

export const publicIdentityVerification = (request, { includePayload = false, origin = identityAppOrigin() } = {}) => {
  if (!request) return null;
  const payload = includePayload ? request.payload : redactPayload(request.payload);
  return {
    ...request,
    payload,
    mobileLink: identityVerificationLink(request, origin)
  };
};

const redactPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload || null;
  const documents = Array.isArray(payload.documents)
    ? payload.documents.map((item) => ({
      kind: item.kind,
      name: item.name,
      type: item.type,
      captured: Boolean(item.captured),
      size: item.size || 0,
      submittedAt: item.submittedAt
    }))
    : [];
  const selfie = payload.selfie
    ? {
      kind: payload.selfie.kind,
      name: payload.selfie.name,
      type: payload.selfie.type,
      captured: Boolean(payload.selfie.captured),
      size: payload.selfie.size || 0,
      submittedAt: payload.selfie.submittedAt
    }
    : null;
  return {
    ...payload,
    documents,
    selfie
  };
};

const createToken = () => crypto.randomBytes(24).toString('hex');

export const findActiveIdentityVerificationRequest = async (prisma, ownerId, flow) => {
  const where = {
    ownerId,
    status: { in: ACTIVE_STATUSES },
    ...(flow ? { flow: normalizeIdentityFlow(flow) } : {})
  };
  return prisma.identityVerification.findFirst({
    where,
    include: identityVerificationInclude,
    orderBy: { updatedAt: 'desc' }
  });
};

export const findLatestRejectedIdentityVerification = async (prisma, ownerId, flow) => (
  prisma.identityVerification.findFirst({
    where: {
      ownerId,
      status: 'rejected',
      ...(flow ? { flow: normalizeIdentityFlow(flow) } : {})
    },
    include: identityVerificationInclude,
    orderBy: { reviewedAt: 'desc' }
  })
);

export const createIdentityVerificationRequest = async (prisma, input = {}) => {
  const ownerId = clean(input.ownerId);
  if (!ownerId) throw new Error('Verification owner is required');
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw new Error('Verification owner was not found');

  const flow = normalizeIdentityFlow(input.flow);
  const active = await findActiveIdentityVerificationRequest(prisma, ownerId, flow);
  const requirement = identityVerificationRequirement(flow);
  const patch = {
    requestedById: clean(input.requestedById) || null,
    source: clean(input.source, 'admin'),
    supportTicketId: clean(input.supportTicketId) || null,
    liveChatSessionId: clean(input.liveChatSessionId) || null,
    tiwloPayProfileId: clean(input.tiwloPayProfileId) || null,
    requirement,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  };

  if (active) {
    const updated = await prisma.identityVerification.update({
      where: { id: active.id },
      data: patch,
      include: identityVerificationInclude
    });
    return { request: updated, created: false };
  }

  const request = await prisma.identityVerification.create({
    data: {
      ownerId,
      flow,
      status: 'requested',
      token: createToken(),
      ...patch
    },
    include: identityVerificationInclude
  });
  return { request, created: true };
};

const updateTiwloPayVerification = async (prisma, request, status, actorId, reason) => {
  const profile = request.tiwloPayProfileId
    ? await prisma.tiwloPayProfile.findUnique({ where: { id: request.tiwloPayProfileId } }).catch(() => null)
    : await prisma.tiwloPayProfile.findUnique({ where: { ownerId: request.ownerId } }).catch(() => null);
  if (!profile) return;
  const settings = profile.settings && typeof profile.settings === 'object' && !Array.isArray(profile.settings)
    ? profile.settings
    : {};
  const verification = settings.verification && typeof settings.verification === 'object' && !Array.isArray(settings.verification)
    ? settings.verification
    : {};
  const approved = status === 'approved';
  await prisma.tiwloPayProfile.update({
    where: { id: profile.id },
    data: {
      status: approved ? 'active' : 'suspended',
      settings: {
        ...settings,
        verification: {
          ...verification,
          status: approved ? 'approved' : 'rejected',
          reviewedAt: new Date().toISOString(),
          reviewedBy: actorId || null,
          rejectionReason: approved ? null : clean(reason, 'ID verification was not approved.'),
          identityVerificationId: request.id,
          capabilities: {
            ...(verification.capabilities || {}),
            paymentLinks: approved,
            api: approved,
            payouts: approved
          }
        }
      }
    }
  });
};

export const reviewIdentityVerificationRequest = async (prisma, id, status, actor = null, reason = '') => {
  const nextStatus = normalizeReviewStatus(status);
  const existing = await prisma.identityVerification.findUnique({
    where: { id },
    include: identityVerificationInclude
  });
  if (!existing) throw new Error('Identity verification was not found');

  const now = new Date();
  const request = await prisma.identityVerification.update({
    where: { id },
    data: {
      status: nextStatus,
      review: {
        status: nextStatus,
        reason: clean(reason, nextStatus === 'approved' ? 'Verified by administrator.' : 'ID verification was not approved.'),
        reviewedById: actor?.id || null,
        reviewedByName: actor?.name || actor?.email || 'Administrator',
        reviewedAt: now.toISOString()
      },
      reviewedAt: now
    },
    include: identityVerificationInclude
  });

  if (request.flow === 'account_recovery') {
    await prisma.user.update({
      where: { id: request.ownerId },
      data: { status: nextStatus === 'approved' ? 'active' : 'disabled' }
    }).catch(() => null);
  }

  if (request.flow === 'tiwlo_pay') {
    await updateTiwloPayVerification(prisma, request, nextStatus, actor?.id, reason);
  }

  return prisma.identityVerification.findUnique({
    where: { id },
    include: identityVerificationInclude
  });
};

export const normalizeReviewStatus = (status) => {
  const value = clean(status).toLowerCase();
  if (FINAL_STATUSES.includes(value)) return value;
  if (value === 'verified') return 'approved';
  if (value === 'not_verified' || value === 'declined' || value === 'denied') return 'rejected';
  throw new Error('Review status must be approved or rejected');
};
