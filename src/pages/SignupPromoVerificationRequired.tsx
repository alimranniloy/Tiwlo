import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { User } from '../types';
import SignupPromoVerification from '../components/signup/SignupPromoVerification';
import { orderedSignupPromoGateways, promoGateways, providerOf, visibleSignupPromoGateways } from '../components/signup/signupPromoUtils';
import {
  fetchCurrentUserWithApi,
  fetchSignupCreditPolicyWithApi,
  fetchSignupPaymentGatewaysWithApi,
  skipSignupPromoCreditWithApi,
  startSignupPromoVerificationWithApi
} from '../lib/tiwloApi';

type Props = {
  user: User;
  setUser: (user: User) => void;
  onLogout: () => void;
};

const defaultCreditPolicy = {
  creditSystemEnabled: true,
  signupPromoCredit: 100,
  signupPromoRequiresPayment: true,
  signupPromoHoldAmount: 1
};

export default function SignupPromoVerificationRequired({ user, setUser, onLogout }: Props) {
  const [searchParams] = useSearchParams();
  const [gateways, setGateways] = useState<any[]>([]);
  const [gatewaysLoading, setGatewaysLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(user.promoPaymentMethod || 'bkash');
  const [creditPolicy, setCreditPolicy] = useState(defaultCreditPolicy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const paymentGateways = useMemo(() => visibleSignupPromoGateways(gateways), [gateways]);
  const promoRequiresPayment = creditPolicy.creditSystemEnabled && creditPolicy.signupPromoRequiresPayment !== false;

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      setError(`Payment ${paymentStatus}. Try again or skip free credit.`);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    fetchSignupCreditPolicyWithApi()
      .then((policy) => {
        if (active && policy) setCreditPolicy({ ...defaultCreditPolicy, ...policy });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setGatewaysLoading(true);
    fetchSignupPaymentGatewaysWithApi()
      .then((items) => {
        if (!active) return;
        const nextGateways = (items || []).filter((item) => item?.provider);
        const nextPromoGateways = promoGateways(nextGateways);
        setGateways(nextGateways);
        if (nextPromoGateways.length) {
          const ordered = orderedSignupPromoGateways(nextPromoGateways);
          setSelectedGateway((current) => ordered.some((gateway) => providerOf(gateway) === current) ? current : providerOf(ordered[0]));
        }
      })
      .catch(() => {
        if (active) setGateways([]);
      })
      .finally(() => {
        if (active) setGatewaysLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchCurrentUserWithApi()
      .then((latestUser) => {
        if (!active || !latestUser) return;
        if (latestUser.promoCreditStatus !== 'pending') {
          setUser(latestUser);
          localStorage.setItem('tiwlo_user', JSON.stringify(latestUser));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setUser]);

  const verify = async () => {
    if (promoRequiresPayment && !selectedGateway) return;
    setLoading(true);
    setError('');
    try {
      const checkout = await startSignupPromoVerificationWithApi(selectedGateway || 'system');
      if (checkout?.paymentUrl) {
        window.location.assign(checkout.paymentUrl);
        return;
      }
      const latestUser = await fetchCurrentUserWithApi();
      if (latestUser) {
        setUser(latestUser);
        localStorage.setItem('tiwlo_user', JSON.stringify(latestUser));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start payment verification.');
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    setLoading(true);
    setError('');
    try {
      const nextUser = await skipSignupPromoCreditWithApi();
      setUser(nextUser);
      localStorage.setItem('tiwlo_user', JSON.stringify(nextUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to skip free credit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignupPromoVerification
      gateways={paymentGateways}
      gatewaysLoading={gatewaysLoading}
      selectedGateway={selectedGateway}
      isLoading={loading}
      error={error}
      topActionLabel="Sign out"
      skipLabel="Skip free credit"
      creditAmount={creditPolicy.signupPromoCredit}
      holdAmount={creditPolicy.signupPromoHoldAmount}
      requiresPayment={promoRequiresPayment}
      onTopAction={onLogout}
      onSelectGateway={setSelectedGateway}
      onVerify={verify}
      onSkip={skip}
    />
  );
}
