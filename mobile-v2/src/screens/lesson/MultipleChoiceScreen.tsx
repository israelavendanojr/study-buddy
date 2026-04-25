import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

const LABELS = ['A', 'B', 'C', 'D']

interface Props {
  progressBar: React.ReactNode
  activityId: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  onDone: (passed: boolean) => void
}

export default function MultipleChoiceScreen({
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

  function handleCheck() {
    if (selected === null) return
    setChecked(true)
  }

  function handleContinue() {
    onDone(isCorrect)
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      {progressBar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot + question bubble */}
        <View style={styles.mascotRow}>
          <MonkeyMascot size={60} />
          <View style={styles.bubble}>
            <Text style={styles.question}>{question}</Text>
          </View>
        </View>

        {/* Options */}
        <View style={styles.options}>
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
                  styles.option,
                  !isSelected && !checked && blockShadow.paper,
                  isSelected && !checked && styles.optionSelected,
                  isSelected && !checked && blockShadow.amber,
                  isRight && styles.optionCorrect,
                  isWrong && styles.optionWrong,
                ]}
              >
                <View style={[styles.labelBadge, isSelected && styles.labelBadgeSelected]}>
                  <Text style={[styles.label, isSelected && styles.labelSelected]}>
                    {LABELS[i]}
                  </Text>
                </View>
                <Text style={styles.optionText}>{opt}</Text>
                {isRight && <Text style={styles.resultIcon}>✓</Text>}
                {isWrong && <Text style={styles.resultIconWrong}>✗</Text>}
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

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {!checked ? (
          <View style={styles.footerRow}>
            <InkButton
              label="Skip"
              onPress={() => { setSelected(null); onDone(false) }}
              variant="ghost"
              fullWidth={false}
              style={styles.skipBtn}
            />
            <InkButton
              label="Check →"
              onPress={handleCheck}
              disabled={selected === null}
              fullWidth={false}
              style={styles.checkBtn}
            />
          </View>
        ) : (
          <InkButton label="Continue →" onPress={handleContinue} />
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
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.ink,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionSelected: {
    borderStyle: 'dashed',
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  labelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  labelBadgeSelected: {
    backgroundColor: colors.amber,
    borderColor: colors.amberDark,
  },
  label: {
    fontFamily: typography.labelBold,
    fontSize: 12,
    color: colors.ink,
  },
  labelSelected: {
    color: colors.white,
  },
  optionText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    lineHeight: 20,
  },
  resultIcon: {
    fontFamily: typography.labelBold,
    fontSize: 16,
    color: colors.success,
  },
  resultIconWrong: {
    fontFamily: typography.labelBold,
    fontSize: 16,
    color: colors.error,
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
  skipBtn: {
    flex: 1,
  },
  checkBtn: {
    flex: 2,
  },
})
