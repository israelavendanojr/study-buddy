import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import MonkeyMascot from '../../components/MonkeyMascot';
import { colors, fonts, spacing } from '../../theme';
import { OnboardingScreenProps } from './types';

export default function WelcomeScreen({ onContinue }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mascotSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(mascotSlide, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Amber accent stripe */}
      <View style={styles.amberStripe} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, paddingTop: insets.top + 16 }]}>

        {/* Hero section */}
        <View style={styles.heroSection}>

          {/* Headline card with mascot floating above-right */}
          <View style={styles.headlineWrapper}>
            <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: mascotSlide }] }]}>
              <MonkeyMascot size={130} />
            </Animated.View>
            <View style={styles.headlineCard}>
              <Text style={styles.headlineBold}>Learn to cook.</Text>
              <Text style={styles.headlineItalic}>Actually cook.</Text>
            </View>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Personalized lessons, real recipes, and active mentorship.
          </Text>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <InkButton label="Get Started" onPress={onContinue} />
          <TouchableOpacity style={styles.signInLink} activeOpacity={0.7}>
            <Text style={styles.signInText}>
              {'Existing user? '}
              <Text style={styles.signInUnderline}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>

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
    justifyContent: 'space-between',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  headlineWrapper: {
    marginTop: 72,
    marginBottom: spacing.xl,
  },
  mascotContainer: {
    position: 'absolute',
    top: -72,
    right: -8,
    zIndex: 10,
  },
  headlineCard: {
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headlineBold: {
    fontFamily: fonts.headline,
    fontSize: 52,
    lineHeight: 60,
    color: colors.ink,
  },
  headlineItalic: {
    fontFamily: fonts.headlineItalic,
    fontSize: 52,
    lineHeight: 60,
    color: colors.amber,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  signInLink: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  signInText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.55,
  },
  signInUnderline: {
    fontFamily: fonts.bodyMedium,
    color: colors.amber,
    opacity: 1,
    textDecorationLine: 'underline',
  },
});
