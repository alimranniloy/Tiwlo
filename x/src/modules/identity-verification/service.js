import { requireAuth } from '../../core/auth.js';
import { AppError, forbidden, notFound } from '../../core/errors.js';
import { removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { notifyDiscordIdentityVerificationEvent } from '../discord/service.js';
import {
  createIdentityVerificationRequest,
  findActiveIdentityVerificationRequest,
  findLatestRejectedIdentityVerification,
  hasVirtualCameraSignal,
  identityVerificationInclude,
  identityVerificationLink,
  identityVerificationRequirement,
  isMobileUserAgent,
  normalizeIdentityFlow,
  publicIdentityVerification,
  reviewIdentityVerificationRequest
} from './core.js';

const STAFF_ROLES = new Set(['super_admin', 'admin', 'manager', 'staff']);
const DATA_URL_PATTERN = /^data:(image\/(?:png|jpe?g|webp));base64,[a-z0-9+/=\r\n]+$/i;
const MAX_DOCUMENT_SIZE = 6 * 1024 * 1024;

const clean = (value, fallback = '') => String(value || fallback || '').trim();

const isStaff = (actor) => STAFF_ROLES.has(String(actor?.role || '').toLowerCase());

const requireStaffActor = async (ctx) => {
  const actor = await requireAuth(ctx);
  if (!isStaff(actor)) forbidden('Support staff access is required');
  return actor;
};

const sanitizeDataUrlDocument = (input = {}, fallbackKind = 'document') => {
  const dataUrl = clean(input.dataUrl);
  if (!DATA_URL_PATTERN.test(dataUrl)) {
    throw new AppError(`${fallbackKind} must be a PNG, JPG, JPEG, or WEBP image`, 'BAD_USER_INPUT');
  }
  const size = Buffer.byteLength(dataUrl, 'utf8');
  if (size > MAX_DOCUMENT_SIZE) {
    throw new AppError(`${fallbackKind} image is too large`, 'BAD_USER_INPUT');
  }
  return {
    kind: clean(input.kind, fallbackKind).toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
    name: clean(input.name, fallbackKind).slice(0, 120),
    type: clean(input.type, dataUrl.match(/^data:([^;]+)/i)?.[1] || 'image/jpeg'),
    dataUrl,
    captured: Boolean(input.captured),
    size,
    submittedAt: new Date().toISOString()
  };
};

const requireMobileCapture = (ctx, inputDevice = {}) => {
  const userAgent = clean(ctx.userAgent || inputDevice.userAgent);
  if (!isMobileUserAgent(userAgent)) {
    throw new AppError('ID verification must be completed from a mobile device camera', 'MOBILE_DEVICE_REQUIRED');
  }
  if (hasVirtualCameraSignal(inputDevice.cameraLabel || inputDevice.videoDeviceLabel || '')) {
    throw new AppError('Virtual or web camera sources are not allowed for live selfie verification', 'BAD_USER_INPUT');
  }
  if (inputDevice.hasTouch === false) {
    throw new AppError('ID verification must be completed from a touch-capable mobile device', 'MOBILE_DEVICE_REQUIRED');
  }
};

const requiredDocumentKinds = (flow) => (
  identityVerificationRequirement(flow).documents.map((item) => item.kind)
);

const ensureRequestOwner = (request, actor) => {
  if (!request) notFound('Identity verification');
  if (request.ownerId !== actor.id && !isStaff(actor)) forbidden();
};

const ensureTiwloPayProfile = async (ctx, ownerId) => (
  ctx.prisma.tiwloPayProfile.findUnique({ where: { ownerId } }).catch(() => null)
);

const setTiwloPaySubmittedState = async (ctx, request) => {
  if (request.flow !== 'tiwlo_pay') return;
  const profile = await ensureTiwloPayProfile(ctx, request.ownerId);
  if (!profile) return;
  const settings = profile.settings && typeof profile.settings === 'object' && !Array.isArray(profile.settings)
    ? profile.settings
    : {};
  const verification = settings.verification && typeof settings.verification === 'object' && !Array.isArray(settings.verification)
    ? settings.verification
    : {};
  await ctx.prisma.tiwloPayProfile.update({
    where: { id: profile.id },
    data: {
      status: 'inactive',
      settings: {
        ...settings,
        verification: {
          ...verification,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          reviewedBy: null,
          identityVerificationId: request.id,
          capabilities: {
            paymentLinks: false,
            api: false,
            payouts: false
          }
        }
      }
    }
  });
};

const createReviewTicket = async (ctx, request) => {
  if (request.supportTicketId) {
    const existing = await ctx.prisma.supportTicket.findUnique({ where: { id: request.supportTicketId } }).catch(() => null);
    if (existing) return existing;
  }

  const flowLabel = request.flow === 'tiwlo_pay' ? 'Tiwlo Pay' : 'Disabled account';
  const ticket = await ctx.prisma.supportTicket.create({
    data: {
      ownerId: request.ownerId,
      subject: `${flowLabel} ID verification review`,
      category: 'id-verification',
      priority: 'high',
      status: 'open',
      message: `${flowLabel} verification was submitted and is waiting for administrator review.`,
      metadata: {
        source: 'identity-verification',
        label: 'id verification',
        caseLabel: 'id verification',
        identityVerificationId: request.id,
        identityVerificationFlow: request.flow,
        reviewStatus: request.status
      },
      messages: {
        create: {
          authorId: request.ownerId,
          authorName: request.owner?.name || request.owner?.email || 'Customer',
          authorRole: 'user',
          body: `${flowLabel} verification was submitted with required document evidence.`,
          visibility: 'public',
          attachments: []
        }
      }
    },
    include: {
      owner: true,
      assignedTo: true,
      messages: { orderBy: { createdAt: 'asc' }, take: 20 }
    }
  });

  await ctx.prisma.identityVerification.update({
    where: { id: request.id },
    data: { supportTicketId: ticket.id }
  });
  return ticket;
};

export const identityVerificationChallenge = async (ctx, args = {}) => {
  const actor = await requireAuth(ctx);
  const flow = args.flow ? normalizeIdentityFlow(args.flow) : null;
  const token = clean(args.token);
  let request = null;
  if (token) {
    request = await ctx.prisma.identityVerification.findUnique({
      where: { token },
      include: identityVerificationInclude
    });
    ensureRequestOwner(request, actor);
  } else {
    request = await findActiveIdentityVerificationRequest(ctx.prisma, actor.id, flow);
  }

  const rejected = await findLatestRejectedIdentityVerification(ctx.prisma, actor.id, flow);
  return toApi({
    request: publicIdentityVerification(request),
    mobileOnly: true,
    mobileLink: request ? identityVerificationLink(request) : '',
    rejectedReason: rejected?.review?.reason || '',
    rejectedAt: rejected?.reviewedAt || null
  });
};

export const listIdentityVerifications = async (ctx, args = {}) => {
  await requireStaffActor(ctx);
  const where = removeUndefined({
    status: args.status ? clean(args.status).toLowerCase() : undefined,
    flow: args.flow ? normalizeIdentityFlow(args.flow) : undefined,
    ownerId: args.ownerId || undefined
  });
  const rows = await ctx.prisma.identityVerification.findMany({
    where,
    include: identityVerificationInclude,
    orderBy: { updatedAt: 'desc' },
    take: Math.min(Number(args.limit || 40), 100)
  });
  return toApi(rows.map((row) => publicIdentityVerification(row, { includePayload: true })));
};

export const startIdentityVerification = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const flow = normalizeIdentityFlow(input.flow);
  const ownerId = clean(input.ownerId, actor.id);
  const selfTiwloPay = flow === 'tiwlo_pay' && ownerId === actor.id;
  if (!selfTiwloPay && !isStaff(actor)) forbidden('Support staff access is required');

  let tiwloPayProfileId = clean(input.tiwloPayProfileId);
  if (flow === 'tiwlo_pay' && !tiwloPayProfileId) {
    const profile = await ensureTiwloPayProfile(ctx, ownerId);
    if (!profile) throw new AppError('Create a Tiwlo Pay profile before starting verification', 'BAD_USER_INPUT');
    tiwloPayProfileId = profile.id;
  }

  const { request, created } = await createIdentityVerificationRequest(ctx.prisma, {
    ownerId,
    flow,
    requestedById: actor.id,
    source: clean(input.source, selfTiwloPay ? 'tiwlo-pay' : 'admin'),
    supportTicketId: input.supportTicketId,
    liveChatSessionId: input.liveChatSessionId,
    tiwloPayProfileId
  });

  await writeAudit(ctx, created ? 'identity_verification_requested' : 'identity_verification_request_refreshed', 'identityVerification', request.id, {
    ownerId,
    flow,
    source: input.source || ''
  });

  return toApi(publicIdentityVerification(request));
};

export const submitIdentityVerification = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const request = await ctx.prisma.identityVerification.findUnique({
    where: { id: clean(input.requestId) },
    include: identityVerificationInclude
  });
  ensureRequestOwner(request, actor);
  if (!['requested', 'rejected'].includes(String(request.status || '').toLowerCase())) {
    throw new AppError('This verification request is already submitted or reviewed', 'BAD_USER_INPUT');
  }

  requireMobileCapture(ctx, input.device || {});

  const requiredKinds = requiredDocumentKinds(request.flow);
  const documents = (Array.isArray(input.documents) ? input.documents : []).map((item) => sanitizeDataUrlDocument(item, item.kind || 'document'));
  const documentsByKind = new Map(documents.map((item) => [item.kind, item]));
  const missing = requiredKinds.filter((kind) => !documentsByKind.has(kind));
  if (missing.length) {
    throw new AppError(`Missing required document: ${missing.join(', ')}`, 'BAD_USER_INPUT');
  }

  const selfie = sanitizeDataUrlDocument(input.selfie, 'selfie');
  if (selfie.kind !== 'selfie') selfie.kind = 'selfie';
  if (!selfie.captured) {
    throw new AppError('A live selfie capture is required', 'BAD_USER_INPUT');
  }

  const now = new Date();
  const submitted = await ctx.prisma.identityVerification.update({
    where: { id: request.id },
    data: {
      status: 'pending',
      submittedAt: now,
      payload: {
        documents,
        selfie,
        device: {
          userAgent: clean(ctx.userAgent || input.device?.userAgent),
          screen: input.device?.screen || null,
          hasTouch: input.device?.hasTouch !== false,
          cameraLabel: clean(input.device?.cameraLabel || input.device?.videoDeviceLabel),
          submittedIp: clean(ctx.requestIp),
          submittedAt: now.toISOString()
        }
      },
      review: null
    },
    include: identityVerificationInclude
  });

  await setTiwloPaySubmittedState(ctx, submitted);
  const ticket = await createReviewTicket(ctx, submitted);
  const linked = await ctx.prisma.identityVerification.update({
    where: { id: submitted.id },
    data: { supportTicketId: ticket.id },
    include: identityVerificationInclude
  });

  await writeAudit(ctx, 'identity_verification_submitted', 'identityVerification', linked.id, {
    flow: linked.flow,
    ownerId: linked.ownerId,
    supportTicketId: ticket.id
  });
  await notifyDiscordIdentityVerificationEvent(ctx, 'submitted', linked, { ticket });

  return toApi({
    request: publicIdentityVerification(linked),
    message: 'ID verification submitted. An administrator will review it shortly.'
  });
};

export const reviewIdentityVerification = async (ctx, id, status, reason = '') => {
  const actor = await requireStaffActor(ctx);
  const request = await reviewIdentityVerificationRequest(ctx.prisma, id, status, actor, reason);
  if (!request) notFound('Identity verification');

  if (request.supportTicketId) {
    await ctx.prisma.supportTicket.update({
      where: { id: request.supportTicketId },
      data: {
        status: request.status === 'approved' ? 'resolved' : 'pending',
        metadata: {
          source: 'identity-verification',
          identityVerificationId: request.id,
          identityVerificationFlow: request.flow,
          reviewStatus: request.status,
          reviewedAt: new Date().toISOString()
        }
      }
    }).catch(() => null);
  }

  await writeAudit(ctx, 'identity_verification_reviewed', 'identityVerification', request.id, {
    status: request.status,
    ownerId: request.ownerId,
    flow: request.flow
  });
  await notifyDiscordIdentityVerificationEvent(ctx, 'reviewed', request, { reason });

  return toApi(publicIdentityVerification(request, { includePayload: true }));
};
