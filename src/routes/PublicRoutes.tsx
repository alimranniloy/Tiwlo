import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import type { User } from '../types';
import TiwloRouteLoader from '../components/TiwloRouteLoader';

const MarketingInfoPage = lazy(() => import('../pages/MarketingInfoPage'));
const DocumentationPage = lazy(() => import('../pages/Documentation'));
const AboutPage = lazy(() => import('../pages/About'));
const SeoTopicPage = lazy(() => import('../pages/SeoTopicPage'));
const CommercePage = lazy(() => import('../pages/Commerce'));
const BroadbandPage = lazy(() => import('../pages/Broadband'));
const TiwloPayCheckout = lazy(() => import('../pages/TiwloPayCheckout'));
const AuraPreview = lazy(() => import('../themes/aura').then((module) => ({ default: module.AuraPreview })));
const EplazaPreview = lazy(() => import('../themes/eplaza').then((module) => ({ default: module.EplazaPreview })));
const StoreUserDashboard = lazy(() => import('../cloudstore/userdashboard'));
const LoginPage = lazy(() => import('../pages/Login'));
const SignupPage = lazy(() => import('../pages/Signup'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const VerifyEmail = lazy(() => import('../pages/VerifyEmail'));
const TSecurityBlocked = lazy(() => import('../pages/TSecurityBlocked'));
const EmailPortal = lazy(() => import('../pages/EmailPortal'));
const LegalPage = lazy(() => import('../pages/LegalPage'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

function RouteLoader() {
  return <TiwloRouteLoader />;
}

export default function PublicRoutes({ onLogin }: { onLogin: (user: User) => void }) {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/services" element={<MarketingInfoPage variant="solutions" />} />
        <Route path="/products" element={<MarketingInfoPage variant="products" />} />
        <Route path="/api" element={<MarketingInfoPage variant="developers" />} />
        <Route path="/partners" element={<MarketingInfoPage variant="partners" />} />
        <Route path="/pricing" element={<MarketingInfoPage variant="pricing" />} />
        <Route path="/support" element={<MarketingInfoPage variant="support" />} />
        <Route path="/documentation" element={<DocumentationPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/bangladesh-hosting" element={<SeoTopicPage topicKey="bangladeshHosting" />} />
        <Route path="/cloud-vps-hosting" element={<SeoTopicPage topicKey="cloudVps" />} />
        <Route path="/tpanel-hosting" element={<SeoTopicPage topicKey="tpanelHosting" />} />
        <Route path="/whmcs-alternative" element={<SeoTopicPage topicKey="whmcsAlternative" />} />
        <Route path="/hosting-free-credit" element={<SeoTopicPage topicKey="freeCredit" />} />
        <Route path="/hosting-features" element={<SeoTopicPage topicKey="hostingFeatures" />} />
        <Route path="/commerce" element={<CommercePage />} />
        <Route path="/broadband" element={<BroadbandPage />} />
        <Route path="/pay/:slug" element={<TiwloPayCheckout />} />
        <Route path="/themes/eplaza/*" element={<EplazaPreview />} />
        <Route path="/themes/aura/*" element={<AuraPreview />} />
        <Route path="/themes/*" element={<AuraPreview />} />
        <Route path="/store/user/*" element={<StoreUserDashboard />} />
        <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
        <Route path="/signup" element={<SignupPage onSignup={onLogin} />} />
        <Route path="/id-verification" element={<LoginPage onLogin={onLogin} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword onLogin={onLogin} />} />
        <Route path="/verify-email" element={<VerifyEmail onLogin={onLogin} />} />
        <Route path="/blocked" element={<TSecurityBlocked />} />
        <Route path="/email" element={<EmailPortal />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
