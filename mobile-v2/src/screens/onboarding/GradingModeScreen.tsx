import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import OnboardingLayout from './OnboardingLayout'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
  route: { params: { goal: string; experience: number; frequency: string } }
}

const OPTIONS = [
  {
    id: 'encouraging',
    label: 'Encouraging',
    desc: 'Generous grades, positive framing. Good if you need a confidence boost.',
    emoji: '🌱',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Honest ratings with a fair threshold. The default for most cooks.',
    emoji: '⚖️',
  },
  {
    id: 'strict',
    label: 'Strict',
    desc: 'High bar, honest feedback. For cooks who want to be pushed.',
    emoji: '🔥',
  },
]

export default function GradingModeScreen({ navigation, route }: Props) {
  const params = route.params
  const [selected, setSelected] = useState<string>('balanced')

  return (
    <OnboardingLayout
      step={4}
      totalSteps={6}
      question="How do you want to be graded?"
      subtitle="This sets how Pepper evaluates your kitchen submissions."
      onContinue={() =>
        navigation.navigate('SuccessDefinition', { ...params, grading_mode: selected })
      }
    >
      {OPTIONS.map((opt) => {
        const isSelected = selected === opt.id
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => setSelected(opt.id)}
            activeOpacity={0.8}
            style={[
              styles.card,
              isSelected ? styles.cardSelected : styles.cardUnselected,
              isSelected ? blockShadow.amber : blockShadow.paper,
            ]}
          >
            <View style={styles.row}>
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <View style={styles.textBlock}>
                <Text style={styles.label}>{opt.label}</Text>
                <Text style={styles.desc}>{opt.desc}</Text>
              </View>
              {isSelected && (
                <View style={styles.check}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: radius.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  cardUnselected: {
    borderStyle: 'solid',
    borderColor: colors.ink,
  },
  cardSelected: {
    borderStyle: 'dashed',
    borderColor: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 26,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  desc: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkMark: {
    color: colors.white,
    fontFamily: typography.labelBold,
    fontSize: 14,
  },
})
