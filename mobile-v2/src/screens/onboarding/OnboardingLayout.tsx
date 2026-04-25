/**
 * Shared layout for all onboarding screens.
 * Renders: grid background, fixed top progress bar, scrollable content, fixed bottom CTA.
 */
import React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import { colors, typography, spacing } from '../../theme'

interface Props {
  step: number        // 1-based
  totalSteps: number  // e.g. 6
  question: string
  subtitle?: string
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
  continueLoading?: boolean
  children: React.ReactNode
}

export default function OnboardingLayout({
  step,
  totalSteps,
  question,
  subtitle,
  onContinue,
  continueLabel = 'Continue →',
  continueDisabled = false,
  continueLoading = false,
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const progress = step / totalSteps

  return (
    <GridBackground style={{ flex: 1 }}>
      {/* ── Fixed top progress bar ── */}
      <View style={[styles.progressContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Question header */}
          <Text style={styles.question}>{question}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {/* Screen-specific content */}
          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Fixed bottom CTA ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton
          label={continueLabel}
          onPress={onContinue}
          disabled={continueDisabled}
          loading={continueLoading}
        />
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.paperShadow,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.amber,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  question: {
    fontFamily: typography.headlineBold,
    fontSize: 26,
    color: colors.ink,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.inkSoft,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  body: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
  },
})
