import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  onBack?: () => void;
}

export default function ProgressBar({ progress, onBack }: ProgressBarProps) {
  const animatedValue = useRef(new Animated.Value(progress * 100)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(100, progress * 100),
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const animatedWidth = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: animatedWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    lineHeight: 34,
    color: colors.ink,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.canvasAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#B35C1E',
  },
});
