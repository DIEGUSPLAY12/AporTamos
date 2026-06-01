/**
 * useGoogleSignIn — Google OAuth flow for AporTamos.
 *
 * Uses expo-auth-session to obtain a Google ID token, then sends it to the
 * backend (/auth/google-login) via the AuthContext's signInWithGoogle.
 *
 * Platform notes:
 * - Web: uses EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (works in `expo start` → w).
 * - Android/iOS: require their own client IDs AND a development build
 *   (Google sign-in does NOT work inside Expo Go on Android/iOS).
 *
 * Client IDs come from env (Google Cloud Console → Credentials):
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useGoogleAuth } from '@/hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// The provider hook throws if the current platform's clientId is undefined.
// We always pass a defined value (real ID or harmless fallback) so the hook
// never crashes, then gate the actual sign-in with `notConfigured` below.
const FALLBACK = 'unconfigured.apps.googleusercontent.com';

// Is the client ID for THIS platform actually set?
const platformConfigured =
  Platform.OS === 'android' ? !!ANDROID_CLIENT_ID
  : Platform.OS === 'ios' ? !!IOS_CLIENT_ID
  : !!WEB_CLIENT_ID;

export interface UseGoogleSignInResult {
  signIn: () => void;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  notConfigured: boolean;
}

export function useGoogleSignIn(): UseGoogleSignInResult {
  const { googleLogin, isLoading, error } = useGoogleAuth();
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID || FALLBACK,
    androidClientId: ANDROID_CLIENT_ID || FALLBACK,
    iosClientId: IOS_CLIENT_ID || FALLBACK,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        googleLogin(idToken).catch((e) => {
          setExchangeError(e?.message || 'Error al iniciar sesión con Google');
        });
      } else {
        setExchangeError('No se recibió el token de Google.');
      }
    } else if (response?.type === 'error') {
      setExchangeError(response.error?.message || 'Error en la autenticación con Google');
    }
  }, [response, googleLogin]);

  return {
    signIn: () => {
      setExchangeError(null);
      if (!platformConfigured) {
        setExchangeError(
          Platform.OS === 'android' || Platform.OS === 'ios'
            ? 'Google en móvil requiere un build de desarrollo. Pruébalo en web (expo start → w).'
            : 'Google Sign-In no está configurado (falta el Client ID web).'
        );
        return;
      }
      promptAsync();
    },
    isReady: !!request,
    isLoading,
    error: exchangeError || error,
    notConfigured: !platformConfigured,
  };
}
