import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Radius } from '@/constants/theme';

export interface ProgressBarProps {
  value: number;        // 0–100
  height?: number;
  color?: string;       // overrides default; defaults to primary, orange at 100%
  trackColor?: string;  // overrides track background
  animated?: boolean;   // animate width change (default true)
  duration?: number;    // animation duration ms (default 400)
}

export default function ProgressBar({
  value,
  height = 8,
  color,
  trackColor,
  animated = true,
  duration = 400,
}: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const clampedValue = Math.min(100, Math.max(0, value));

  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useRef(new Animated.Value(0)).current;

  // Resolve fill color: explicit prop > 100%-orange > primary
  const fillColor = color ?? (clampedValue === 100 ? colors.streak : colors.primary);
  const resolvedTrackColor = trackColor ?? colors.primaryFixed;

  // Animate or snap fill width when value/trackWidth changes
  useEffect(() => {
    if (trackWidth === 0) return;
    const targetWidth = (clampedValue / 100) * trackWidth;

    if (animated) {
      Animated.timing(fillWidth, {
        toValue: targetWidth,
        duration,
        useNativeDriver: false, // width is a layout property, cannot use native driver
      }).start();
    } else {
      fillWidth.setValue(targetWidth);
    }
  }, [clampedValue, trackWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== trackWidth) {
      setTrackWidth(w);
      // Snap immediately on first layout without animating from 0
      fillWidth.setValue((clampedValue / 100) * w);
    }
  };

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: resolvedTrackColor,
        },
      ]}
      onLayout={handleLayout}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: fillColor,
            width: fillWidth,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
