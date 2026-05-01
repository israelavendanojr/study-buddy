import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import GridBackground from './GridBackground';
import MonkeyMascot from './MonkeyMascot';
import { colors, fonts } from '../theme';

interface LoadingScreenProps {
  headline: string;
  // Static body text (no animation)
  bodyText?: string;
  // Typewriter keyword mode: bodyPrefix + animated keyword + bodySuffix
  bodyPrefix?: string;
  keywords?: string[];
  bodySuffix?: string;
  onContinue?: () => void;
  duration?: number;
}

export default function LoadingScreen({
  headline,
  bodyText,
  bodyPrefix = '',
  keywords = [],
  bodySuffix = '',
  onContinue,
  duration = 9000,
}: LoadingScreenProps) {
  const [dotCount, setDotCount] = useState(3);
  const [displayedHeadline, setDisplayedHeadline] = useState('');
  const [displayedWord, setDisplayedWord] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(1)).current;
  const headlinePulse = useRef(new Animated.Value(1)).current;
  const headlineRef = useRef('');
  const wordIdxRef = useRef(0);
  const isDeletingRef = useRef(false);
  const displayedRef = useRef('');

  const hasKeywords = keywords.length > 0;
  const onContinueRef = useRef(onContinue);
  useEffect(() => { onContinueRef.current = onContinue; }, [onContinue]);

  useEffect(() => {
    // Screen fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Mascot flip loop: snap left/right every 2.2s
    Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(flipAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(flipAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ])
    ).start();

    // Dots cycling
    const dotsInterval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);

    let headlineTimeout: ReturnType<typeof setTimeout>;
    let keywordTimeout: ReturnType<typeof setTimeout>;

    const typeKeyword = () => {
      const target = keywords[wordIdxRef.current];

      if (!isDeletingRef.current) {
        const next = target.slice(0, displayedRef.current.length + 1);
        displayedRef.current = next;
        setDisplayedWord(next);

        if (next === target) {
          isDeletingRef.current = true;
          keywordTimeout = setTimeout(typeKeyword, 1600);
        } else {
          keywordTimeout = setTimeout(typeKeyword, 80);
        }
      } else {
        const next = displayedRef.current.slice(0, -1);
        displayedRef.current = next;
        setDisplayedWord(next);

        if (next === '') {
          isDeletingRef.current = false;
          wordIdxRef.current = (wordIdxRef.current + 1) % keywords.length;
          keywordTimeout = setTimeout(typeKeyword, 150);
        } else {
          keywordTimeout = setTimeout(typeKeyword, 45);
        }
      }
    };

    const typeHeadline = () => {
      const next = headline.slice(0, headlineRef.current.length + 1);
      headlineRef.current = next;
      setDisplayedHeadline(next);

      if (next.length < headline.length) {
        headlineTimeout = setTimeout(typeHeadline, 55);
      } else {
        Animated.loop(
          Animated.sequence([
            Animated.timing(headlinePulse, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
            Animated.timing(headlinePulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
          ])
        ).start();
        if (hasKeywords) {
          keywordTimeout = setTimeout(typeKeyword, 400);
        }
      }
    };

    headlineTimeout = setTimeout(typeHeadline, 500);

    const advanceTimeout = setTimeout(() => {
      onContinueRef.current?.();
    }, duration);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(headlineTimeout);
      clearTimeout(keywordTimeout);
      clearTimeout(advanceTimeout);
    };
  }, []);

  const dots = '.'.repeat(dotCount);

  return (
    <View style={styles.root}>
      <GridBackground />
      <View style={styles.amberStripe} />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View style={{ transform: [{ scaleX: flipAnim }] }}>
          <MonkeyMascot size={120} />
        </Animated.View>
        <View style={styles.spacerLg} />
        <Text style={styles.loadingLabel}>{`LOADING${dots}`}</Text>
        <View style={styles.spacerSm} />
        <Animated.Text style={[styles.headline, { opacity: headlinePulse }]}>{displayedHeadline}</Animated.Text>
        <View style={styles.spacerMd} />
        {hasKeywords ? (
          <Text style={styles.body}>
            {bodyPrefix}
            <Text style={styles.bodyKeyword}>{displayedWord}</Text>
            {bodySuffix}
          </Text>
        ) : (
          <Text style={styles.body}>{bodyText}</Text>
        )}
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
  bodyKeyword: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.amber,
    letterSpacing: 0.5,
  },
});
