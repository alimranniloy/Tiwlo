import { activeCooldownsForKeys, cooldownKeysFromContext, writeCooldownsForBlock } from '../db/repository.js';

const reasonForCooldown = (item) => {
  switch (item.keyType) {
    case 'email':
      return 'Email Blocked under Cooldown';
    case 'phone':
      return 'Phone Blocked under Cooldown';
    case 'device':
      return 'Device Blocked under Cooldown';
    case 'ip':
      return 'IP Blocked under Cooldown';
    case 'subnet':
      return 'Subnet Blocked under Cooldown';
    default:
      return 'Identity Blocked under Cooldown';
  }
};

export const checkCooldown = async ({ prisma, context, policy }) => {
  const keys = cooldownKeysFromContext(context);
  const active = await activeCooldownsForKeys(prisma, keys);
  const signals = active.map((item) => ({
    key: `cooldown_${item.keyType}`,
    label: item.reason || reasonForCooldown(item),
    score: policy.weights?.activeCooldown || 130,
    block: true,
    reason: reasonForCooldown(item),
    previousReason: item.reason || '',
    blockedUntil: item.blockedUntil,
    keyType: item.keyType
  }));

  return {
    passed: signals.length === 0,
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};

export const saveCooldownsForBlock = writeCooldownsForBlock;
