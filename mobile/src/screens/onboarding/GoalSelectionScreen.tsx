import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import OnboardingLayout from './OnboardingLayout'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
}

const GOALS = [
  { id: 'scratch', label: 'Learn to cook from scratch', icon: '🍳', active: true },
  { id: 'home', label: 'Cook better at home', icon: '🏠', active: true },
  { id: 'skill', label: 'Master a specific skill', icon: '🔪', active: true },
  { id: 'cuisine', label: 'Learn a cuisine', icon: '🌍', active: false },
  { id: 'healthy', label: 'Cook healthier', icon: '🥦', active: false },
  { id: 'allergy', label: 'Allergy-aware cooking', icon: '⚠️', active: false },
]

export default function GoalSelectionScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <OnboardingLayout
      step={1}
      totalSteps={6}
      question="What's your main cooking goal?"
      subtitle="This shapes your whole roadmap."
      onContinue={() => navigation.navigate('Experience', { goal: selected })}
      continueDisabled={!selected}
    >
      <View style={styles.grid}>
        {GOALS.map((goal) => {
          const isSelected = selected === goal.id
          const isDisabled = !goal.active
          return (
            <TouchableOpacity
              key={goal.id}
              onPress={() => goal.active && setSelected(goal.id)}
              activeOpacity={goal.active ? 0.8 : 1}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                !isSelected && styles.cardUnselected,
                isSelected ? blockShadow.amber : blockShadow.paper,
                isDisabled && styles.cardDisabled,
              ]}
            >
              <Text style={styles.icon}>{goal.icon}</Text>
              <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
                {goal.label}
              </Text>
              {isDisabled && (
                <Text style={styles.comingSoon}>COMING SOON</Text>
              )}
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '47.5%',
    borderWidth: 2,
    borderRadius: radius.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    minHeight: 110,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardUnselected: {
    borderStyle: 'solid',
    borderColor: colors.ink,
  },
  cardSelected: {
    borderStyle: 'dashed',
    borderColor: colors.ink,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: typography.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  labelDisabled: {
    color: colors.inkSoft,
  },
  comingSoon: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.inkSoft,
    marginTop: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.labelBold,
  },
})
