import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import GridBackground from '../../components/GridBackground';
import MonkeyMascot from '../../components/MonkeyMascot';
import { colors, fonts } from '../../theme';

interface Props {
  onComplete?: () => void;
}

export default function RoadmapLoadingScreen({ onComplete }: Props) {
  const [dotCount, setDotCount] = useState(3);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const dots = '.'.repeat(dotCount);

  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={styles.amberStripe} />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <MonkeyMascot size={120} />
        <View style={styles.spacerLg} />
        <Text style={styles.loadingLabel}>{`LOADING${dots}`}</Text>
        <View style={styles.spacerSm} />
        <Text style={styles.headline}>Building your unique{'\n'}roadmap...</Text>
        <View style={styles.spacerMd} />
        <Text style={styles.body}>
          Curating lessons based on your goals,{'\n'}time, and grading mode.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  amberStripe: {
    height: 8,
    backgroundColor: colors.amber,
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  spacerLg: {
    height: 32,
  },
  spacerMd: {
    height: 16,
  },
  spacerSm: {
    height: 12,
  },
  loadingLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
  },
  headline: {
    fontFamily: fonts.headlineItalic,
    fontSize: 28,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 36,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
});
