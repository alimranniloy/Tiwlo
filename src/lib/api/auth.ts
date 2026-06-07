import { User } from '../../types';
import { graphQL, setAuthToken, userFields } from './client';
import { checkSignupAvailabilityViaTSecurity, createTSecurityAuthToken } from '../../../tSecurity/client/tSecurityClient';

export async function loginWithApi(email: string, password: string) {
  const tSecurityToken = await createTSecurityAuthToken('login', { email, password });
  const data = await graphQL<{ login: { token: string; user: User } }>(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
        user { ${userFields} }
      }
    }`,
    { input: { tSecurityToken } }
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
  signupPromoOptIn?: boolean;
  signupPromoProvider?: string;
}) {
  const tSecurityToken = await createTSecurityAuthToken('signup', input);
  const data = await graphQL<{ signup: {
    ok: boolean;
    requiresWhatsAppOtp: boolean;
    challengeId?: string;
    phone?: string;
    phoneE164?: string;
    expiresAt?: string;
    resendAvailableAt?: string;
    message?: string;
    token?: string;
    user?: User;
  } }>(
    `mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        ok
        requiresWhatsAppOtp
        challengeId
        phone
        phoneE164
        expiresAt
        resendAvailableAt
        message
        token
        user { ${userFields} }
      }
    }`,
    { input: { tSecurityToken } }
  );

  if (data.signup.token) setAuthToken(data.signup.token);
  return data.signup;
}

export async function checkSignupAvailabilityWithApi(input: { email?: string; phone?: string; mobileCountryCode?: string; country?: string }) {
  return checkSignupAvailabilityViaTSecurity(input);
}

export async function verifySignupWhatsAppOtpWithApi(challengeId: string, code: string) {
  const data = await graphQL<{ verifySignupWhatsAppOtp: { token: string; user: User } }>(
    `mutation VerifySignupWhatsAppOtp($challengeId: ID!, $code: String!) {
      verifySignupWhatsAppOtp(challengeId: $challengeId, code: $code) {
        token
        user { ${userFields} }
      }
    }`,
    { challengeId, code }
  );
  setAuthToken(data.verifySignupWhatsAppOtp.token);
  return data.verifySignupWhatsAppOtp;
}

export async function resendSignupWhatsAppOtpWithApi(challengeId: string) {
  const data = await graphQL<{ resendSignupWhatsAppOtp: any }>(
    `mutation ResendSignupWhatsAppOtp($challengeId: ID!) {
      resendSignupWhatsAppOtp(challengeId: $challengeId) {
        ok
        challengeId
        phone
        phoneE164
        expiresAt
        resendAvailableAt
        message
      }
    }`,
    { challengeId }
  );
  return data.resendSignupWhatsAppOtp;
}

export async function changeSignupWhatsAppPhoneWithApi(challengeId: string, input: { phone?: string; mobileCountryCode?: string; country?: string }) {
  const data = await graphQL<{ changeSignupWhatsAppPhone: any }>(
    `mutation ChangeSignupWhatsAppPhone($challengeId: ID!, $input: WhatsAppPhoneInput!) {
      changeSignupWhatsAppPhone(challengeId: $challengeId, input: $input) {
        ok
        challengeId
        phone
        phoneE164
        expiresAt
        resendAvailableAt
        message
      }
    }`,
    { challengeId, input }
  );
  return data.changeSignupWhatsAppPhone;
}

export async function startWhatsAppVerificationWithApi(input?: { phone?: string; mobileCountryCode?: string; country?: string }) {
  const data = await graphQL<{ startWhatsAppVerification: any }>(
    `mutation StartWhatsAppVerification($input: WhatsAppPhoneInput) {
      startWhatsAppVerification(input: $input) {
        ok
        challengeId
        phone
        phoneE164
        expiresAt
        resendAvailableAt
        message
      }
    }`,
    { input }
  );
  return data.startWhatsAppVerification;
}

export async function verifyWhatsAppOtpWithApi(challengeId: string, code: string) {
  const data = await graphQL<{ verifyWhatsAppOtp: { token: string; user: User } }>(
    `mutation VerifyWhatsAppOtp($challengeId: ID!, $code: String!) {
      verifyWhatsAppOtp(challengeId: $challengeId, code: $code) {
        token
        user { ${userFields} }
      }
    }`,
    { challengeId, code }
  );
  setAuthToken(data.verifyWhatsAppOtp.token);
  return data.verifyWhatsAppOtp;
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

export async function requestPasswordResetWithApi(input: string | { email?: string; identifier?: string; phone?: string; mobileCountryCode?: string; country?: string }) {
  const variables = typeof input === 'string' ? { email: input } : input;
  const data = await graphQL<{ requestPasswordReset: boolean }>(
    `mutation RequestPasswordReset($email: String, $identifier: String, $phone: String, $mobileCountryCode: String, $country: String) {
      requestPasswordReset(email: $email, identifier: $identifier, phone: $phone, mobileCountryCode: $mobileCountryCode, country: $country)
    }`,
    variables
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
