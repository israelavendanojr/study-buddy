import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import OnboardingLayout from './OnboardingLayout'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
  route: { params: { goal: string } }
}

const OPTIONS = [
  { id: 1, label: 'Total Beginner', desc: "I burn toast. I'm starting from zero." },
  { id: 2, label: 'Occasional Cook', desc: 'I can follow a recipe but improvising is scary.' },
  { id: 3, label: 'Home Cook', desc: 'I cook regularly and feel comfortable in the kitchen.' },
  { id: 4, label: 'Kitchen Pro', desc: "I've worked in kitchens or cook at a high level." },
]

export default function ExperienceScreen({ navigation, route }: Props) {
  const { goal } = route.params
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <OnboardingLayout
      step={2}
      totalSteps={6}
      question="How would you describe your cooking right now?"
      onContinue={() => navigation.navigate('Frequency', { goal, experience: selected })}
      continueDisabled={selected === null}
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
    alignItems: 'center',
    gap: spacing.md,
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
  },
  checkMark: {
    color: colors.white,
    fontFamily: typography.labelBold,
    fontSize: 14,
  },
})
