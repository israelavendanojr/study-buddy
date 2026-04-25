import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing, radius, blockShadow } from '../../theme'

interface Props {
  progressBar: React.ReactNode
  activityId: string
  question: string
  options: string[]   // Text descriptions of images (shown as labeled cards until real images exist)
  correctIndex: number
  explanation: string
  onDone: (passed: boolean) => void
}

export default function ImageIDScreen({
  progressBar,
  question,
  options,
  correctIndex,
  explanation,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets()
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)

  const isCorrect = selected === correctIndex

  return (
    <GridBackground style={{ flex: 1 }}>
      {progressBar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot + question */}
        <View style={styles.mascotRow}>
          <MonkeyMascot size={56} />
          <View style={styles.bubble}>
            <Text style={styles.question}>{question}</Text>
          </View>
        </View>

        {/* 2×2 image grid */}
        <View style={styles.grid}>
          {options.map((opt, i) => {
            const isSelected = selected === i
            const isRight = checked && i === correctIndex
            const isWrong = checked && isSelected && !isRight

            return (
              <TouchableOpacity
                key={i}
                onPress={() => !checked && setSelected(i)}
                activeOpacity={checked ? 1 : 0.8}
                style={[
                  styles.imageCard,
                  !isSelected && !checked && blockShadow.paper,
                  isSelected && !checked && styles.imageCardSelected,
                  isSelected && !checked && blockShadow.amber,
                  isRight && styles.imageCardCorrect,
                  isWrong && styles.imageCardWrong,
                ]}
              >
                {/* Placeholder image area */}
                <View style={[styles.imagePlaceholder, isRight && styles.imagePlaceholderCorrect]}>
                  <Text style={styles.imageLetter}>{String.fromCharCode(65 + i)}</Text>
                </View>
                {/* Caption */}
                <Text style={styles.caption} numberOfLines={3}>{opt}</Text>

                {/* Check badge for correct */}
                {isRight && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Explanation */}
        {checked && (
          <View style={[styles.explanation, isCorrect ? styles.explCorrect : styles.explWrong]}>
            <Text style={styles.explLabel}>{isCorrect ? 'CORRECT' : 'NOT QUITE'}</Text>
            <Text style={styles.explText}>{explanation}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {!checked ? (
          <View style={styles.footerRow}>
            <InkButton
              label="Skip"
              onPress={() => onDone(false)}
              variant="ghost"
              fullWidth={false}
              style={styles.skipBtn}
            />
            <InkButton
              label="Check →"
              onPress={() => setChecked(true)}
              disabled={selected === null}
              fullWidth={false}
              style={styles.checkBtn}
            />
          </View>
        ) : (
          <InkButton label="Continue →" onPress={() => onDone(isCorrect)} />
        )}
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
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  question: {
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageCard: {
    width: '47.5%',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.ink,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  imageCardSelected: {
    borderStyle: 'dashed',
  },
  imageCardCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  imageCardWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
    opacity: 0.6,
  },
  imagePlaceholder: {
    height: 100,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.paperShadow,
  },
  imagePlaceholderCorrect: {
    backgroundColor: colors.successLight,
  },
  imageLetter: {
    fontFamily: typography.headlineBold,
    fontSize: 32,
    color: colors.paperShadow,
  },
  caption: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 17,
    padding: spacing.sm,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: colors.white,
    fontFamily: typography.labelBold,
    fontSize: 12,
  },
  explanation: {
    borderWidth: 2,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  explCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  explWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  explLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  explText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
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
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: { flex: 1 },
  checkBtn: { flex: 2 },
})
