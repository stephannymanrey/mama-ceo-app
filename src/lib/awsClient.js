import { Amplify } from 'aws-amplify';
import {
  signIn, signUp, signOut, confirmSignUp,
  getCurrentUser, fetchAuthSession, resetPassword,
  updatePassword
} from 'aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_ZvJgj7iG1',
      userPoolClientId: '5hjqj36u9oeud7cs8onj93d36j',
      loginWith: {
        email: true
      }
    }
  }
});

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
    // Amplify no tiene listener directo como Supabase, retornamos stub
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  signInWithPassword: async ({ email, password }) => {
    try {
      await signIn({ username: email, password });
      const user = await getCurrentUser();
      return { data: { user: { id: user.userId, email, user_metadata: { full_name: user.username } } }, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
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
