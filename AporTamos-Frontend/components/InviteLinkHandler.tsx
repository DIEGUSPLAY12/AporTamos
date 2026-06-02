/**
 * InviteLinkHandler — processes household invitation deep links.
 *
 * Invitation emails contain a link like `<scheme>://...?invite=<householdId>`.
 * Opening it launches the app; this handler reads the `invite` param and:
 *   - if logged in  → joins the household and navigates into it
 *   - if logged out → remembers it and joins right after the user logs in
 *
 * Renders nothing; mounted once near the app root inside the providers.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { acceptInvitation } from '@/services/api';

const PENDING_KEY = 'pending_invite_household';

export default function InviteLinkHandler() {
  const { isLoggedIn, user } = useAuth();
  const url = Linking.useURL();
  const router = useRouter();
  const processedRef = useRef<string | null>(null);

  const tryProcess = useCallback(async () => {
    const householdId = await AsyncStorage.getItem(PENDING_KEY);
    if (!householdId) return;

    // Not authenticated yet — keep it pending; it runs again after login.
    if (!isLoggedIn || !user?.id) return;

    // Avoid double-processing the same invite
    if (processedRef.current === householdId) return;
    processedRef.current = householdId;
    await AsyncStorage.removeItem(PENDING_KEY);

    try {
      await acceptInvitation(householdId);
      Alert.alert('¡Te has unido!', 'Ahora formas parte del hogar.');
    } catch {
      // Already a member (or transient) — just navigate in.
    }
    router.replace(`/(tabs)/${householdId}` as any);
  }, [isLoggedIn, user?.id, router]);

  // Capture the invite id from any incoming/initial URL
  useEffect(() => {
    if (!url) return;
    try {
      const { queryParams } = Linking.parse(url);
      const invite = queryParams?.invite;
      if (invite && typeof invite === 'string') {
        AsyncStorage.setItem(PENDING_KEY, invite).then(tryProcess);
      }
    } catch {
      // ignore malformed URLs
    }
  }, [url, tryProcess]);

  // Re-run when auth state becomes ready (handles "open link → then log in")
  useEffect(() => {
    tryProcess();
  }, [isLoggedIn, tryProcess]);

  return null;
}
