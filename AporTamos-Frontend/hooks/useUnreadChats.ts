/**
 * useUnreadChats — number of households with unread chat messages (T109).
 *
 * Recomputes on mount and every 30s. Kept lightweight (one limit=1 fetch per
 * household) and intended to drive the Chats tab badge.
 */

import { useState, useEffect } from 'react';
import { useHouseholdContext } from '@/context/HouseholdContext';
import { useAuthState } from '@/hooks/useAuth';
import { countUnreadHouseholds } from '@/services/chatUnread';

export function useUnreadChats(): number {
  const { households } = useHouseholdContext();
  const { user } = useAuthState();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const compute = async () => {
      const c = await countUnreadHouseholds(households, user?.id);
      if (active) setCount(c);
    };
    compute();
    const timer = setInterval(compute, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [households, user?.id]);

  return count;
}
