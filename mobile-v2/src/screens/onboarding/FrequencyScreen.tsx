import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import OnboardingLayout from './OnboardingLayout'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
  route: { params: { goal: string; experience: number } }
}

const OPTIONS = [
  { id: 'rarely', label: 'Rarely', desc: 'Once a week or less.' },
  { id: 'sometimes', label: 'Sometimes', desc: 'A few times a week.' },
  { id: 'often', label: 'Often', desc: 'Most evenings.' },
  { id: 'daily', label: 'Daily', desc: "I'm in the kitchen every day." },
]

export default function FrequencyScreen({ navigation, route }: Props) {
  const { goal, experience } = route.params
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <OnboardingLayout
      step={3}
      totalSteps={6}
      question="How often do you cook right now?"
      onContinue={() => navigation.navigate('GradingMode', { goal, experience, frequency: selected })}
      continueDisabled={!selected}
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
            <Text style={styles.label}>{opt.label}</Text>
            <Text style={styles.desc}>{opt.desc}</Text>
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
    gap: 4,
  },
  cardUnselected: {
    borderStyle: 'solid',
    borderColor: colors.ink,
  },
  cardSelected: {
    borderStyle: 'dashed',
    borderColor: colors.ink,
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
  },
})
