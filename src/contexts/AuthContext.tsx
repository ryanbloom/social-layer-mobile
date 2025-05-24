import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { getAuthToken, storeAuthToken, removeAuthToken, getProfileByToken } from '../services/api';
import { Profile } from '../types';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if user is already signed in
      const token = await getAuthToken();
      if (token) {
        // For demo purposes, if we have a demo token, create demo user
        if (token.startsWith('demo_auth_token_')) {
          const demoProfile = {
            id: 1,
            handle: 'demo_user',
            nickname: 'Demo User',
            image_url: 'https://via.placeholder.com/120',
            about: 'Demo user signed in via Google',
            email: 'demo@gmail.com',
            verified: false,
            status: 'active'
          };
          setUser(demoProfile);
        } else {
          // Try to get real profile from API
          const profile = await getProfileByToken(token);
          if (profile) {
            setUser(profile);
          } else {
            // Token is invalid, remove it
            await removeAuthToken();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, simulate Google OAuth flow
      console.log('Demo: Simulating Google OAuth flow...');
      
      // Create a demo token to simulate successful authentication
      const demoToken = 'demo_auth_token_' + Date.now();
      
      // Store the demo token
      await storeAuthToken(demoToken);
      
      // Create a demo user profile
      const demoProfile = {
        id: 1,
        handle: 'demo_user',
        nickname: 'Demo User',
        image_url: 'https://via.placeholder.com/120',
        about: 'Demo user signed in via Google OAuth',
        email: 'demo@gmail.com',
        verified: false,
        status: 'active'
      };
      
      setUser(demoProfile);
      
      // TODO: Replace with actual Google OAuth flow using AuthSession:
      // const clientId = 'YOUR_GOOGLE_CLIENT_ID';
      // const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      // 
      // const request = new AuthSession.AuthRequest({
      //   clientId,
      //   scopes: ['openid', 'profile', 'email'],
      //   responseType: AuthSession.ResponseType.Code,
      //   redirectUri,
      //   additionalParameters: {},
      //   state: await Crypto.digestStringAsync(
      //     Crypto.CryptoDigestAlgorithm.SHA256,
      //     redirectUri + Date.now(),
      //     { encoding: Crypto.CryptoEncoding.BASE64URL }
      //   ),
      // });
      // 
      // const result = await request.promptAsync({
      //   authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      // });
      // 
      // if (result.type === 'success') {
      //   const authToken = await exchangeCodeForToken(result.params.code);
      //   await storeAuthToken(authToken);
      //   const profile = await getProfileByToken(authToken);
      //   setUser(profile);
      // }
      
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await removeAuthToken();
      setUser(null);
    } catch (error) {
      console.error('Sign-out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        const profile = await getProfileByToken(token);
        setUser(profile);
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// TODO: Implement token exchange with your backend
// const exchangeGoogleToken = async (googleIdToken: string): Promise<string> => {
//   const API_URL = process.env.EXPO_PUBLIC_API_URL;
//   const response = await fetch(`${API_URL}/auth/google`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       idToken: googleIdToken,
//     }),
//   });
//
//   if (!response.ok) {
//     throw new Error('Failed to exchange Google token');
//   }
//
//   const data = await response.json();
//   return data.authToken || data.auth_token || data.token;
// };