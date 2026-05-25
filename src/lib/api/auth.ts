import { User } from '../../types';
import { graphQL, setAuthToken, userFields } from './client';

export async function loginWithApi(email: string, password: string) {
  const data = await graphQL<{ login: { token: string; user: User } }>(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
        user { ${userFields} }
      }
    }`,
    { input: { email, password } }
  );

  setAuthToken(data.login.token);
  return data.login;
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
  const data = await graphQL<{ signup: { token: string; user: User } }>(
    `mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        token
        user { ${userFields} }
      }
    }`,
    { input }
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
