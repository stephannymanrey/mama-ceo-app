import { Amplify } from 'aws-amplify';
import {
  signIn, signUp, signOut, confirmSignUp,
  getCurrentUser, fetchAuthSession, resetPassword,
  updatePassword, confirmResetPassword
} from 'aws-amplify/auth';

let amplifyConfigured = false;

try {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: 'us-east-1_ZvJgj7iG1',
        userPoolWebClientId: '5hjqj36u9oeud7cs8onj93d36j',
        region: 'us-east-1'
      }
    }
  });
  amplifyConfigured = true;
} catch (err) {
  console.warn('Amplify configuration warning:', err.message);
}

export const isAwsConfigured = false;

export async function getAwsAuthToken() {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString() || "";
  } catch {
    return "";
  }
}

export const awsAuth = {
  getSession: async () => {
    try {
      const user = await getCurrentUser();
      return { data: { session: { user: { id: user.userId, email: user.signInDetails?.loginId, user_metadata: { full_name: user.username } } } }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  },

  onAuthStateChange: (callback) => {
    void callback;
    // Amplify Auth v6 does not expose the same app-level listener shape used here.
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  signInWithPassword: async ({ email, password }) => {
    if (!amplifyConfigured) {
      return { data: null, error: { message: 'Autenticación no disponible en este momento. Por favor, intenta más tarde.' } };
    }
    try {
      await signIn({ username: email, password });
      const user = await getCurrentUser();
      return { data: { user: { id: user.userId, email, user_metadata: { full_name: user.username } } }, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message || 'Error al iniciar sesión' } };
    }
  },

  signUp: async ({ email, password, options }) => {
    try {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email, name: options?.data?.full_name || '' } }
      });
      return { data: {}, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },

  confirmSignUp: async ({ email, code }) => {
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  },

  signOut: async () => {
    try {
      await signOut();
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  },

  resetPasswordForEmail: async (email) => {
    try {
      await resetPassword({ username: email });
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  },

  updateUser: async ({ password }) => {
    try {
      await updatePassword({ oldPassword: '', newPassword: password });
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  }
};

export async function confirmAwsResetPassword({ email, code, newPassword }) {
  try {
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
    return { error: null };
  } catch (err) {
    return { error: { message: err.message } };
  }
}
