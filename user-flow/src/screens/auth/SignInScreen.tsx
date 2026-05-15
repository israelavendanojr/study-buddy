import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import MonkeyMascot from '../../components/MonkeyMascot';
import { colors, fonts, spacing, borderRadius } from '../../theme';

interface SignInScreenProps {
  onBack: () => void;
}

export default function SignInScreen({ onBack }: SignInScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mascotSlide = useRef(new Animated.Value(-20)).current;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleSignIn = () => {
    // TODO: wire up Supabase auth — supabase.auth.signInWithPassword({ email, password })
  };

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Amber accent stripe */}
      <View style={styles.amberStripe} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, paddingTop: insets.top + 16 }]}>

        {/* Hero section */}
        <View style={styles.heroSection}>
          <View style={styles.headlineWrapper}>
            <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: mascotSlide }] }]}>
              <MonkeyMascot size={110} />
            </Animated.View>
            <View style={styles.headlineCard}>
              <Text style={styles.headlineBold}>Welcome back.</Text>
              <Text style={styles.headlineItalic}>Sign in.</Text>
            </View>
          </View>

          {/* Inputs */}
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.onSurfaceVariant}
                secureTextEntry
              />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <InkButton label="Sign In" onPress={handleSignIn} />
          <TouchableOpacity style={styles.backLink} activeOpacity={0.7} onPress={onBack}>
            <Text style={styles.backText}>
              {'Don\'t have an account? '}
              <Text style={styles.backUnderline}>Get started</Text>
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
    top: -68,
    right: -8,
    zIndex: 10,
  },
  headlineCard: {
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headlineBold: {
    fontFamily: fonts.headline,
    fontSize: 44,
    lineHeight: 52,
    color: colors.ink,
  },
  headlineItalic: {
    fontFamily: fonts.headlineItalic,
    fontSize: 44,
    lineHeight: 52,
    color: colors.amber,
  },
  inputGroup: {
    gap: spacing.md,
  },
  inputWrapper: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.ink,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  input: {
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  backLink: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  backText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.55,
  },
  backUnderline: {
    fontFamily: fonts.bodyMedium,
    color: colors.amber,
    opacity: 1,
    textDecorationLine: 'underline',
  },
});
