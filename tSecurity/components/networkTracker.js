import { countRecentSignupTicketsForSubnet } from '../db/repository.js';
import { clean } from '../utils.js';

export const trackNetwork = async ({ prisma, action, context, policy }) => {
  const signals = [];
  const subnet = clean(context.ipSubnet);
  if (!subnet) {
    return { passed: true, score: 0, signals };
  }

  if (action === 'signup') {
    const recent = await countRecentSignupTicketsForSubnet(prisma, subnet, policy.subnetWindowMinutes || 30);
    const limit = Number(policy.subnetSignupLimit || 5);
    if (recent >= limit) {
      signals.push({
        key: 'subnet_registration_burst',
        label: `Multiple registrations from ${subnet}`,
        score: policy.weights?.subnetBurst || 110,
        block: true,
        reason: 'Subnet Registration Burst',
        subnet,
        recent,
        limit
      });
    }
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
