import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Svg, { Path, Circle } from 'react-native-svg'
import Companion from '../../components/Companion'
import { colors, radius, shadows } from '../../theme'

// ── Icons ─────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12 15L7 10l5-5"
        stroke={colors.muted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ClockIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={colors.foreground} strokeWidth={1.8} />
      <Path
        d="M12 6v6l4 2.5"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Session goal options ──────────────────────────────────────────────────────────

const SESSION_GOALS = [
  { minutes: 10, label: '10 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '60 min' },
]

interface CommitmentParams {
  goalType: string
  experience: string
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CommitmentScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: CommitmentParams }, 'params'>>()
  const { goalType, experience } = route.params

  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  const handleContinue = () => {
    if (sessionMinutes === null) return
    navigation.navigate('Grading', {
      goalType,
      experience,
      sessionHours: 0,
      sessionMinutes,
      daysPerWeek: 3,
      weeks: 4,
    })
  }

  const onPressIn = () =>
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.companionTopRight}>
            <Companion size={70} mood="idle" />
          </View>
        </View>

        <Text style={styles.headline}>What's your session goal?</Text>
        <Text style={styles.subheading}>Pick the time that fits your schedule best.</Text>

        {/* Session goals grid */}
        <View style={styles.goalsGrid}>
          {SESSION_GOALS.map((goal) => (
            <SessionGoalCard
              key={goal.minutes}
              minutes={goal.minutes}
              label={goal.label}
              isSelected={sessionMinutes === goal.minutes}
              onSelect={setSessionMinutes}
            />
          ))}
        </View>

        {/* Continue button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPress={handleContinue}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={sessionMinutes === null}
            style={[styles.continueBtn, shadows.mint, sessionMinutes === null && styles.continueBtnDisabled]}
          >
            <Text style={styles.continueBtnText}>Continue →</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  )
}

// ── SessionGoalCard ───────────────────────────────────────────────────────────────

function SessionGoalCard({
  minutes,
  label,
  isSelected,
  onSelect,
}: {
  minutes: number
  label: string
  isSelected: boolean
  onSelect: (v: number) => void
}) {
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.timing(scale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  return (
    <Animated.View style={[styles.goalCardWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => onSelect(minutes)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.goalCard, isSelected && styles.goalCardSelected]}
      >
        <View style={styles.goalCardIcon}>
          <ClockIcon />
        </View>
        <Text style={[styles.goalCardLabel, isSelected && styles.goalCardLabelSelected]}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
  },
  companionTopRight: {
    marginTop: -8,
  },
  headline: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 24,
    color: colors.foreground,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
    marginBottom: 32,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  goalCardWrapper: {
    width: '47.5%',
  },
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  goalCardSelected: {
    backgroundColor: colors.mint,
  },
  goalCardIcon: {
    marginBottom: 12,
  },
  goalCardLabel: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
    textAlign: 'center',
  },
  goalCardLabelSelected: {
    color: colors.foreground,
  },
  continueBtn: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
  },
})
