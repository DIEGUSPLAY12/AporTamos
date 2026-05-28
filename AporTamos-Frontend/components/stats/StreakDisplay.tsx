import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius } from '@/constants/theme';

const MILESTONES = [7, 30, 100];

const MILESTONE_LABELS: Record<number, string> = {
  7: '¡1 semana!',
  30: '¡1 mes!',
  100: '¡100 días!',
};

export type StreakDisplaySize = 'compact' | 'default' | 'large';

export interface StreakDisplayProps {
  streak: number;
  size?: StreakDisplaySize;
}

export default function StreakDisplay({ streak, size = 'default' }: StreakDisplayProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const [milestoneLabel, setMilestoneLabel] = useState<string | null>(null);
  const milestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMilestone = MILESTONES.includes(streak);

  useEffect(() => {
    if (streak === 0) return;

    // Celebrate milestones with a more pronounced animation
    if (isMilestone) {
      setMilestoneLabel(MILESTONE_LABELS[streak] ?? null);

      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.35,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();

      if (milestoneTimer.current) clearTimeout(milestoneTimer.current);
      milestoneTimer.current = setTimeout(() => setMilestoneLabel(null), 3000);
    } else {
      // Subtle pulse on every streak change
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (milestoneTimer.current) clearTimeout(milestoneTimer.current);
    };
  }, [streak]);

  const sizing = sizeMap[size];

  return (
    <View style={styles.wrapper}>
      {/* Glow halo for milestones */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            backgroundColor: colors.streak + '33',
            width: sizing.glowSize,
            height: sizing.glowSize,
            borderRadius: sizing.glowSize / 2,
          },
        ]}
        pointerEvents="none"
      />

      {/* Main badge */}
      <Animated.View
        style={[
          styles.badge,
          {
            backgroundColor: isMilestone ? colors.streak : colors.streak + '22',
            borderRadius: Radius.full,
            transform: [{ scale }],
            paddingHorizontal: sizing.paddingH,
            paddingVertical: sizing.paddingV,
            gap: sizing.gap,
          },
        ]}
      >
        <Text style={[styles.fire, { fontSize: sizing.fireFontSize }]}>🔥</Text>
        <Text
          style={[
            styles.number,
            {
              fontSize: sizing.numberFontSize,
              color: isMilestone ? '#ffffff' : colors.streak,
            },
          ]}
        >
          {streak}
        </Text>
      </Animated.View>

      {/* Milestone label */}
      {milestoneLabel ? (
        <View style={[styles.milestoneLabel, { backgroundColor: colors.streak }]}>
          <Text style={styles.milestoneLabelText}>{milestoneLabel}</Text>
        </View>
      ) : null}

      {/* Days sub-label for default/large sizes */}
      {size !== 'compact' ? (
        <Text style={[styles.daysLabel, { color: colors.onSurfaceVariant }]}>
          {streak === 1 ? 'día' : 'días de racha'}
        </Text>
      ) : null}
    </View>
  );
}

const sizeMap: Record<StreakDisplaySize, {
  fireFontSize: number;
  numberFontSize: number;
  paddingH: number;
  paddingV: number;
  gap: number;
  glowSize: number;
}> = {
  compact: {
    fireFontSize: 14,
    numberFontSize: 14,
    paddingH: Spacing.md,
    paddingV: Spacing.xs,
    gap: 2,
    glowSize: 60,
  },
  default: {
    fireFontSize: 22,
    numberFontSize: 22,
    paddingH: Spacing.lg,
    paddingV: Spacing.sm,
    gap: 4,
    glowSize: 100,
  },
  large: {
    fireFontSize: 32,
    numberFontSize: 36,
    paddingH: Spacing.xl,
    paddingV: Spacing.md,
    gap: 6,
    glowSize: 140,
  },
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  glow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fire: {
    lineHeight: undefined,
  },
  number: {
    fontWeight: '800',
  },
  milestoneLabel: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  milestoneLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  daysLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
