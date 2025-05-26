import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import {
  getAuthToken,
  storeAuthToken,
  removeAuthToken,
  getProfileByToken,
  sendEmailPin,
  verifyEmailPin,
} from "../services/api";
import { Profile } from "../types";

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  actionLoading: boolean;
  isDemoMode: boolean;
  demoStarredEvents: Set<number>;
  demoAttendingEvents: Set<number>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  verifyPin: (email: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggleDemoStar: (eventId: number) => void;
  toggleDemoAttendance: (eventId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // For initial auth check
  const [actionLoading, setActionLoading] = useState(false); // For sign-in actions
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStarredEvents, setDemoStarredEvents] = useState<Set<number>>(
    new Set(),
  );
  const [demoAttendingEvents, setDemoAttendingEvents] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if user is already signed in
      const token = await getAuthToken();
      if (token) {
        // For demo purposes, if we have a demo token, create demo user
        if (token.startsWith("demo_auth_token_")) {
          const demoProfile = {
            id: 1,
            handle: "demo_user",
            nickname: "Demo User",
            about: "Demo user account",
            email: "example@example.com",
            verified: false,
            status: "active",
          };
          setUser(demoProfile);
          setIsDemoMode(true);
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
      console.error("Auth initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string) => {
    // Check for demo account
    if (email.trim().toLowerCase() === "example@example.com") {
      try {
        setActionLoading(true);

        // Create demo token and store it
        const demoToken = "demo_auth_token_" + Date.now();
        await storeAuthToken(demoToken);

        // Create demo user profile
        const demoProfile = {
          id: 1,
          handle: "demo_user",
          nickname: "Demo User",
          about: "Demo user account",
          email: "example@example.com",
          verified: false,
          status: "active",
        };

        setUser(demoProfile);
        setIsDemoMode(true);
        return;
      } catch (error) {
        console.error("DEBUG AuthContext: Demo sign-in error:", error);
        throw error;
      } finally {
        setActionLoading(false);
      }
    }

    // Regular email sign-in flow
    try {
      setActionLoading(true);
      await sendEmailPin(email);
    } catch (error: any) {
      console.error("DEBUG AuthContext: Send email PIN error:", error);
      console.error("DEBUG AuthContext: Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        type: typeof error,
      });
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const verifyPin = async (email: string, pin: string) => {
    try {
      setActionLoading(true);
      const authToken = await verifyEmailPin(email, pin);
      await storeAuthToken(authToken);

      // Get user profile with the new token
      const profile = await getProfileByToken(authToken);
      if (profile) {
        setUser(profile);
      } else {
        console.error("DEBUG AuthContext: No profile returned from API");
        throw new Error("Failed to get profile after authentication");
      }
    } catch (error: any) {
      console.error("DEBUG AuthContext: PIN verification error:", error);
      console.error("DEBUG AuthContext: Error details:", {
        name: error?.name,
        message: error?.message,
        type: typeof error,
      });
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setActionLoading(true);

      // For demo purposes, simulate Google OAuth flow
      console.log("Demo: Simulating Google OAuth flow...");

      // Create a demo token to simulate successful authentication
      const demoToken = "demo_auth_token_" + Date.now();

      // Store the demo token
      await storeAuthToken(demoToken);

      // Create a demo user profile
      const demoProfile = {
        id: 1,
        handle: "demo_user",
        nickname: "Demo User",
        about: "Demo user signed in via Google OAuth",
        email: "demo@gmail.com",
        verified: false,
        status: "active",
      };

      setUser(demoProfile);
      setIsDemoMode(true);

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
      console.error("Google sign-in error:", error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setActionLoading(true);
      await removeAuthToken();
      setUser(null);
      setIsDemoMode(false);
      setDemoStarredEvents(new Set());
      setDemoAttendingEvents(new Set());
    } catch (error) {
      console.error("Sign-out error:", error);
    } finally {
      setActionLoading(false);
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
      console.error("Refresh profile error:", error);
    }
  };

  const toggleDemoStar = (eventId: number) => {
    if (!isDemoMode) return;

    setDemoStarredEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const toggleDemoAttendance = (eventId: number) => {
    if (!isDemoMode) return;

    setDemoAttendingEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const value: AuthContextType = {
    user,
    loading,
    actionLoading,
    isDemoMode,
    demoStarredEvents,
    demoAttendingEvents,
    signInWithGoogle,
    signInWithEmail,
    verifyPin,
    signOut,
    refreshProfile,
    toggleDemoStar,
    toggleDemoAttendance,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
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
