import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import OnboardingLayout from './OnboardingLayout'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
  route: { params: Record<string, unknown> }
}

const OPTIONS = [
  { id: 5, label: '5 min', desc: 'Short and sharp. One concept at a time.' },
  { id: 10, label: '10 min', desc: 'The sweet spot for most people.' },
  { id: 20, label: '20 min', desc: 'Deep dives with more practice rounds.' },
  { id: 30, label: '30 min', desc: 'Full sessions, nothing skipped.' },
]

export default function CommitmentScreen({ navigation, route }: Props) {
  const params = route.params
  const [selected, setSelected] = useState<number>(10)

  return (
    <OnboardingLayout
      step={6}
      totalSteps={6}
      question="How much time can you spend per session?"
      subtitle="This sets the lesson depth and pacing of your roadmap."
      continueLabel="Build My Roadmap →"
      onContinue={() =>
        navigation.navigate('RoadmapLoading', { ...params, session_minutes: selected })
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
              <Text style={styles.time}>{opt.label}</Text>
              <Text style={styles.desc}>{opt.desc}</Text>
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
  time: {
    fontFamily: typography.headlineBold,
    fontSize: 22,
    color: colors.ink,
    minWidth: 56,
  },
  desc: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
    flex: 1,
  },
})
