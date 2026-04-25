import React, { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import MonkeyMascot from '../../components/MonkeyMascot'
import { gradeFillBlank } from '../../api/client'
import { colors, typography, spacing, radius } from '../../theme'

interface Props {
  progressBar: React.ReactNode
  activityId: string
  sentence: string
  correctAnswer: string
  wordBank: string[]
  explanation: string
  lessonTitle: string
  goal: string
  lessonKey: string
  userId: string
  onDone: (passed: boolean) => void
}

export default function FillBlankScreen({
  progressBar,
  activityId,
  sentence,
  correctAnswer,
  wordBank,
  explanation,
  lessonTitle,
  goal,
  lessonKey,
  userId,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets()
  const [filled, setFilled] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; feedback: string } | null>(null)

  // Split sentence at ___ to render inline blank
  const parts = sentence.split('___')

  // Build word bank: use provided words or generate from correct answer
  const words = wordBank.length > 0 ? wordBank : shuffleWithCorrect(correctAnswer)

  async function handleCheck() {
    if (!filled) return
    setChecking(true)
    try {
      const res = await gradeFillBlank({
        user_id: userId,
        lesson_key: lessonKey,
        activity_id: activityId,
        user_answer: filled,
        correct_answer: correctAnswer,
        lesson_title: lessonTitle,
        goal,
      })
      setResult(res)
    } catch {
      // Fallback: simple string match
      const correct = filled.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
      setResult({ correct, feedback: correct ? 'Correct!' : `The answer is: ${correctAnswer}` })
    } finally {
      setChecking(false)
    }
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      {progressBar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mascotRow}>
          <MonkeyMascot size={56} />
          <Text style={styles.prompt}>Complete the sentence.</Text>
        </View>

        {/* Sentence with blank */}
        <View style={styles.sentenceBox}>
          <Text style={styles.sentencePart}>{parts[0]}</Text>
          <View style={[styles.blank, filled && styles.blankFilled]}>
            {filled ? (
              <Text style={styles.blankText}>{filled}</Text>
            ) : (
              <Text style={styles.blankPlaceholder}>tap a word</Text>
            )}
          </View>
          {parts[1] ? <Text style={styles.sentencePart}>{parts[1]}</Text> : null}
        </View>

        {/* Word bank chips */}
        {!result && (
          <View style={styles.wordBank}>
            {words.map((word, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setFilled(word === filled ? null : word)}
                style={[styles.chip, word === filled && styles.chipSelected]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, word === filled && styles.chipTextSelected]}>
                  {word}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={[styles.result, result.correct ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultLabel}>{result.correct ? 'CORRECT' : 'NOT QUITE'}</Text>
            <Text style={styles.resultText}>{result.feedback}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {!result ? (
          <View style={styles.footerRow}>
            <InkButton
              label="Skip"
              onPress={() => onDone(false)}
              variant="ghost"
              fullWidth={false}
              style={styles.skipBtn}
            />
            <InkButton
              label={checking ? '...' : 'Check →'}
              onPress={handleCheck}
              disabled={!filled || checking}
              loading={checking}
              fullWidth={false}
              style={styles.checkBtn}
            />
          </View>
        ) : (
          <InkButton label="Continue →" onPress={() => onDone(result.correct)} />
        )}
      </View>
    </GridBackground>
  )
}

function shuffleWithCorrect(correct: string): string[] {
  // Generate simple distractors
  const distractors = ['280°F', '212°F', 'Maillard', 'fond', 'mise en place', 'emulsify']
    .filter((d) => d.toLowerCase() !== correct.toLowerCase())
    .slice(0, 3)
  const all = [correct, ...distractors]
  return all.sort(() => Math.random() - 0.5)
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  prompt: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
    flex: 1,
  },
  sentenceBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  sentencePart: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 24,
  },
  blank: {
    minWidth: 80,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  blankFilled: {
    backgroundColor: colors.amber + '22',
  },
  blankText: {
    fontFamily: typography.bodyBold,
    fontSize: 16,
    color: colors.amber,
  },
  blankPlaceholder: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
    fontStyle: 'italic',
  },
  wordBank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.amber,
    borderColor: colors.amberDark,
    borderStyle: 'solid',
  },
  chipText: {
    fontFamily: typography.labelMedium,
    fontSize: 14,
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.white,
  },
  result: {
    borderWidth: 2,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  resultWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  resultLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  resultText: {
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
