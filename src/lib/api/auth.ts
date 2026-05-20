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

export async function signupWithApi(name: string, email: string, password: string) {
  const data = await graphQL<{ signup: { token: string; user: User } }>(
    `mutation Signup($input: SignupInput!) {
      signup(input: $input) {
        token
        user { ${userFields} }
      }
    }`,
    { input: { name, email, password } }
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
