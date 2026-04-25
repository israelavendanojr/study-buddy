import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import { colors, typography, spacing, radius } from '../../theme'

interface Props {
  progressBar: React.ReactNode
  headline: string
  body: string
  whyItMatters?: string
  onContinue: () => void
}

export default function ConceptBeatScreen({ progressBar, headline, body, whyItMatters, onContinue }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <GridBackground style={{ flex: 1 }}>
      {progressBar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Concept headline */}
        <Text style={styles.headline}>{headline}</Text>

        {/* Body */}
        {body ? (
          <Text style={styles.body}>{body}</Text>
        ) : null}

        {/* Why this matters callout */}
        {whyItMatters ? (
          <View style={styles.whyBox}>
            <Text style={styles.whyLabel}>WHY THIS MATTERS</Text>
            <Text style={styles.whyText}>{whyItMatters}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton label="Got it →" onPress={onContinue} />
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  headline: {
    fontFamily: typography.headlineBold,
    fontSize: 26,
    color: colors.ink,
    lineHeight: 34,
  },
  body: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 26,
  },
  whyBox: {
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  whyLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  whyText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 21,
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
