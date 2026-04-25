import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing } from '../../theme'

interface Props {
  progressBar: React.ReactNode
  motivation: string
  learnPoints: string[]
  onContinue: () => void
}

export default function HookScreen({ progressBar, motivation, learnPoints, onContinue }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <GridBackground style={{ flex: 1 }}>
      {progressBar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot + speech bubble */}
        <View style={styles.mascotRow}>
          <MonkeyMascot size={72} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{motivation}</Text>
          </View>
        </View>

        {/* What you'll learn */}
        <Text style={styles.sectionLabel}>WHAT YOU'LL LEARN</Text>
        <View style={styles.pointsList}>
          {learnPoints.map((pt, i) => (
            <View key={i} style={styles.pointRow}>
              <Text style={styles.bullet}>→</Text>
              <Text style={styles.pointText}>{pt}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton label="Let's go →" onPress={onContinue} />
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bubble: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  bubbleText: {
    fontFamily: typography.headlineItalic,
    fontSize: 17,
    color: colors.ink,
    lineHeight: 26,
  },
  sectionLabel: {
    fontFamily: typography.labelBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  pointsList: {
    gap: spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    fontFamily: typography.labelBold,
    fontSize: 14,
    color: colors.amber,
    marginTop: 2,
  },
  pointText: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
    lineHeight: 22,
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
