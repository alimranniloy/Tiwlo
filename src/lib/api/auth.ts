import { User } from '../../types';
import { graphQL, setAuthToken, userFields } from './client';
import { detectBrowserCountryCode } from '../countries';

function deviceMetadata() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { deviceFingerprint: 'server', deviceMetadata: {} };
  }
  const screenText = typeof window.screen !== 'undefined'
    ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
    : '';
  const metadata = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    language: navigator.language || '',
    platform: navigator.platform || '',
    vendor: navigator.vendor || '',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    screen: screenText,
    userAgent: navigator.userAgent || '',
    country: detectBrowserCountryCode('')
  };
  const deviceFingerprint = [
    metadata.userAgent,
    metadata.language,
    metadata.platform,
    metadata.vendor,
    metadata.timezone,
    metadata.screen,
    metadata.hardwareConcurrency,
    metadata.deviceMemory,
    metadata.maxTouchPoints
  ].join('|');
  return { deviceFingerprint, deviceMetadata: metadata };
}

export async function loginWithApi(email: string, password: string) {
  const device = deviceMetadata();
  const data = await graphQL<{ login: { token: string; user: User } }>(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
        user { ${userFields} }
      }
    }`,
    { input: { email, password, ...device } }
  );

  setAuthToken(data.login.token);
  return data.login;
}

export async function fetchCurrentUserWithApi() {
  const data = await graphQL<{ me: User | null }>(
    `query CurrentUser {
      me { ${userFields} }
    }`
  );

  return data.me;
}

export async function signupWithApi(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  mobileCountryCode?: string;
  country?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  billingName?: string;
}) {
  const device = deviceMetadata();
  const data = await graphQL<{ signup: { token: string; user: User } }>(
    `mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        token
        user { ${userFields} }
      }
    }`,
    { input: { ...input, ...device } }
  );

  setAuthToken(data.signup.token);
  return data.signup;
}

export async function verifyCurrentPasswordWithApi(password: string) {
  const data = await graphQL<{ verifyPassword: boolean }>(
    `mutation VerifyPassword($password: String!) {
      verifyPassword(password: $password)
    }`,
    { password }
  );

  return data.verifyPassword;
}

export async function requestPasswordResetWithApi(email: string) {
  const data = await graphQL<{ requestPasswordReset: boolean }>(
    `mutation RequestPasswordReset($email: String!) {
      requestPasswordReset(email: $email)
    }`,
    { email }
  );

  return data.requestPasswordReset;
}

export async function resetPasswordWithApi(token: string, password: string) {
  const data = await graphQL<{ resetPassword: { token: string; user: User } }>(
    `mutation ResetPassword($token: String!, $password: String!) {
      resetPassword(token: $token, password: $password) {
        token
        user { ${userFields} }
      }
    }`,
    { token, password }
  );

  setAuthToken(data.resetPassword.token);
  return data.resetPassword;
}

export async function resendEmailVerificationWithApi() {
  const data = await graphQL<{ resendEmailVerification: boolean }>(
    `mutation ResendEmailVerification {
      resendEmailVerification
    }`
  );

  return data.resendEmailVerification;
}

export async function verifyEmailWithApi(token: string) {
  const data = await graphQL<{ verifyEmail: { token: string; user: User } }>(
    `mutation VerifyEmail($token: String!) {
      verifyEmail(token: $token) {
        token
        user { ${userFields} }
      }
    }`,
    { token }
  );

  setAuthToken(data.verifyEmail.token);
  return data.verifyEmail;
}
