import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import LessonProgressBar from '../../components/ui/LessonProgressBar'
import { colors, typography, spacing, radius } from '../../theme'

const MC_LABELS = ['A', 'B', 'C']

export default function RecipeStepScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets()
  const { lessonData, stepIndex, lessonKey, lessonTitle, goal, experience } = route.params
  const steps = lessonData?.steps ?? []
  const step = steps[stepIndex]
  const totalSteps = steps.length
  const checkpoint = step?.checkpoint

  const [cpSelected, setCpSelected] = useState<number | null>(null)
  const [cpChecked, setCpChecked] = useState(false)

  function goNext() {
    if (stepIndex + 1 < totalSteps) {
      navigation.push('RecipeStep', { ...route.params, stepIndex: stepIndex + 1 })
    } else {
      navigation.navigate('RecipePhoto', { ...route.params })
    }
  }

  if (!step) {
    navigation.navigate('RecipePhoto', { ...route.params })
    return null
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      <LessonProgressBar
        current={stepIndex + 1}
        total={totalSteps}
        label={`STEP ${stepIndex + 1} OF ${totalSteps}`}
        onClose={() => navigation.navigate('MainTabs')}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step header */}
        <Text style={styles.stepLabel}>STEP {step.step_number}</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>

        {/* Instruction */}
        <Text style={styles.instruction}>{step.instruction}</Text>

        {/* "What to Look For" tip */}
        {step.image_prompt && (
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>WHAT TO LOOK FOR</Text>
            <Text style={styles.tipText}>{step.image_prompt}</Text>
          </View>
        )}

        {/* Checkpoint question */}
        {checkpoint && checkpoint.type === 'quiz' && (
          <View style={styles.checkpointBox}>
            <Text style={styles.checkpointLabel}>⚡ CHECKPOINT</Text>
            <Text style={styles.checkpointQuestion}>{checkpoint.question}</Text>

            {checkpoint.options?.map((opt: string, i: number) => {
              const isSelected = cpSelected === i
              const isRight = cpChecked && i === checkpoint.correct_index
              const isWrong = cpChecked && isSelected && !isRight
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => !cpChecked && setCpSelected(i)}
                  style={[
                    styles.cpOption,
                    isSelected && !cpChecked && styles.cpOptionSelected,
                    isRight && styles.cpOptionCorrect,
                    isWrong && styles.cpOptionWrong,
                  ]}
                >
                  <Text style={styles.cpLabel}>{MC_LABELS[i]}</Text>
                  <Text style={styles.cpText}>{opt}</Text>
                </TouchableOpacity>
              )
            })}

            {!cpChecked && (
              <InkButton
                label="Check Answer"
                onPress={() => setCpChecked(true)}
                disabled={cpSelected === null}
                style={{ marginTop: spacing.sm }}
              />
            )}
            {cpChecked && (
              <Text style={styles.cpFeedback}>
                {cpSelected === checkpoint.correct_index ? '✓ Correct.' : `The answer is ${MC_LABELS[checkpoint.correct_index ?? 0]}.`}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton
          label={stepIndex + 1 < totalSteps ? 'Step Done →' : 'Ready to Plate →'}
          onPress={goNext}
          disabled={checkpoint?.type === 'quiz' && !cpChecked}
        />
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
  stepLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amber,
  },
  stepTitle: {
    fontFamily: typography.headlineBold,
    fontSize: 24,
    color: colors.ink,
    lineHeight: 30,
    marginTop: -spacing.sm,
  },
  instruction: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 26,
  },
  tipBox: {
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  tipLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  tipText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
  checkpointBox: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  checkpointLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  checkpointQuestion: {
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  cpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.paperShadow,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  cpOptionSelected: {
    borderColor: colors.ink,
    borderStyle: 'dashed',
  },
  cpOptionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  cpOptionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
    opacity: 0.6,
  },
  cpLabel: {
    fontFamily: typography.labelBold,
    fontSize: 12,
    color: colors.inkSoft,
    width: 18,
  },
  cpText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  cpFeedback: {
    fontFamily: typography.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
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
