import React, { useRef, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
// import * as AuthSession from 'expo-auth-session'; // kept in case makeRedirectUri is needed later

WebBrowser.maybeCompleteAuthSession();
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
import { OnboardingScreenProps } from '../onboarding/types';
import { supabase } from '../../lib/supabase';

// Google "G" logo mark
function GoogleIcon() {
  return (
    <Text style={styles.oauthIconText}>G</Text>
  );
}

// Apple logo approximation using unicode
function AppleIcon() {
  return (
    <Text style={styles.oauthIconText}></Text>
  );
}

export default function SignUpScreen({ onContinue, onBack, onSignIn }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mascotSlide = useRef(new Animated.Value(-20)).current;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) {
      onContinue?.();
    } else {
      setError('Check your email to confirm your account.');
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      // const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'userflow' }); // falls back to localhost in dev
      const redirectUrl = 'userflow://';

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });

      if (oauthError || !data.url) {
        setError(oauthError?.message ?? 'OAuth failed');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        const url = result.url;
        const fragmentParams = new URLSearchParams(url.split('#')[1] ?? '');
        const queryParams = new URLSearchParams(url.split('?')[1] ?? '');

        const code = queryParams.get('code');
        const access_token = fragmentParams.get('access_token');
        const refresh_token = fragmentParams.get('refresh_token') ?? '';

        if (code) {
          // PKCE flow (Supabase v2 default)
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) { setError(sessionError.message); return; }
          if (sessionData.session) onContinue?.();
        } else if (access_token) {
          // Implicit flow fallback
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessionError) { setError(sessionError.message); return; }
          if (sessionData.session) onContinue?.();
        } else {
          setError('Sign-in was cancelled or failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApple = () => {
    // TODO: supabase.auth.signInWithOAuth({ provider: 'apple' })
  };

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Amber accent stripe */}
      <View style={styles.amberStripe} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, paddingTop: insets.top + 16 }]}>

        {/* Back button */}
        {onBack && (
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        )}

        {/* Hero section */}
        <View style={styles.heroSection}>
          <View style={styles.headlineWrapper}>
            <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: mascotSlide }] }]}>
              <MonkeyMascot size={110} />
            </Animated.View>
            <View style={styles.headlineCard}>
              <Text style={styles.headlineBold}>Create your</Text>
              <Text style={styles.headlineItalic}>account.</Text>
            </View>
          </View>

          {/* OAuth buttons */}
          <View style={styles.oauthGroup}>
            <TouchableOpacity style={styles.oauthButton} activeOpacity={0.75} onPress={handleGoogle}>
              <GoogleIcon />
              <Text style={styles.oauthLabel}>Continue with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.oauthButton} activeOpacity={0.75} onPress={handleApple}>
              <AppleIcon />
              <Text style={styles.oauthLabel}>Continue with Apple</Text>
            </TouchableOpacity>
          </View>

          {/* OR divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / Password inputs */}
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
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <InkButton label={loading ? 'Signing up…' : 'Sign Up'} onPress={handleSignUp} />

          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          <TouchableOpacity style={styles.signInLink} activeOpacity={0.7} onPress={onSignIn}>
            <Text style={styles.signInText}>
              Already have an account?{' '}
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
    marginTop: 56,
    marginBottom: spacing.lg,
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
    paddingVertical: spacing.lg,
  },
  headlineBold: {
    fontFamily: fonts.headline,
    fontSize: 40,
    lineHeight: 48,
    color: colors.ink,
  },
  headlineItalic: {
    fontFamily: fonts.headlineItalic,
    fontSize: 40,
    lineHeight: 48,
    color: colors.amber,
  },
  oauthGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
  },
  oauthIconText: {
    fontFamily: fonts.label,
    fontSize: 17,
    color: colors.ink,
    lineHeight: 20,
  },
  oauthLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.ink,
    opacity: 0.15,
  },
  dividerText: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.ink,
    opacity: 0.4,
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
  termsText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    opacity: 0.45,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    opacity: 1,
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
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    lineHeight: 34,
    color: colors.ink,
    fontWeight: '600',
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.amber,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
