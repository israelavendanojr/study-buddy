import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import { useUser } from '@clerk/clerk-expo'
import Svg, { Path } from 'react-native-svg'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, radius, shadows } from '../../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

// ── Back icon ─────────────────────────────────────────────────────────────────

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

// ── Loading animation constants ───────────────────────────────────────────────

const PARTICLE_COLORS = [
  colors.mint,
  colors.peach,
  colors.golden,
  colors.lavender,
  colors.sky,
  colors.mint,
  colors.peach,
  colors.golden,
]

const PARTICLE_POSITIONS: Array<{
  top?: number | string
  bottom?: number | string
  left?: number | string
  right?: number | string
}> = [
  { top: '12%', left: '8%' },
  { top: '18%', right: '12%' },
  { top: '38%', left: '5%' },
  { top: '32%', right: '6%' },
  { bottom: '28%', left: '10%' },
  { bottom: '22%', right: '8%' },
  { bottom: '12%', left: '35%' },
  { top: '55%', right: '14%' },
]

// ── Goal type label map ───────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  learn_from_scratch: 'Learn to cook from scratch',
  cook_better: 'Cook better at home',
  skill_focus: 'Master a specific cooking skill',
  host_impress: 'Cook impressive meals for others',
  understand_flavor: 'Understand flavor and seasoning',
  cuisine_focus: 'Learn a specific cuisine',
}

// ── Params ────────────────────────────────────────────────────────────────────

interface GoalConfirmationParams {
  goalType: string
  experience: string
  sessionHours: number
  sessionMinutes: number
  daysPerWeek: number
  weeks: number
  gradingMode: string
  coachingResult: object | null
  conversationHistory: Array<{ role: string; content: string }>
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function GoalConfirmationScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: GoalConfirmationParams }, 'params'>>()
  const params = route.params
  const { user } = useUser()

  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Entry animation
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  // Loading screen animations
  const arcSpin = useRef(new Animated.Value(0)).current
  const companionSpin = useRef(new Animated.Value(0)).current
  const loadingFade = useRef(new Animated.Value(0)).current
  const particleAnims = useRef(Array.from({ length: 8 }, () => new Animated.Value(0.3))).current

  const arcSpinRef = useRef<Animated.CompositeAnimation | null>(null)
  const companionSpinRef = useRef<Animated.CompositeAnimation | null>(null)
  const particleRefs = useRef<Animated.CompositeAnimation[]>([])

  const experienceToInt = (exp: string): number => {
    if (exp === 'beginner') return 1
    if (exp === 'advanced') return 5
    return 3
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()

    fetchSummary()
  }, [])

  useEffect(() => {
    if (generating) {
      loadingFade.setValue(0)
      Animated.timing(loadingFade, { toValue: 1, duration: 300, useNativeDriver: true }).start()

      arcSpin.setValue(0)
      arcSpinRef.current = Animated.loop(
        Animated.timing(arcSpin, { toValue: 1, duration: 900, useNativeDriver: true })
      )
      arcSpinRef.current.start()

      companionSpin.setValue(0)
      companionSpinRef.current = Animated.loop(
        Animated.timing(companionSpin, { toValue: 1, duration: 2400, useNativeDriver: true })
      )
      companionSpinRef.current.start()

      particleRefs.current.forEach((a) => a.stop())
      particleRefs.current = particleAnims.map((anim, i) => {
        anim.setValue(0.3)
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          ])
        )
        setTimeout(() => loop.start(), i * 180)
        return loop
      })
    } else {
      arcSpinRef.current?.stop()
      companionSpinRef.current?.stop()
      particleRefs.current.forEach((a) => a.stop())
    }
  }, [generating])

  const fetchSummary = async () => {
    const expInt = experienceToInt(params.experience)
    try {
      const res = await fetch(`${API_BASE}/roadmap/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: GOAL_LABELS[params.goalType] ?? params.goalType,
          buddy_name: 'Garlic',
          experience: expInt,
          session_hours: params.sessionHours,
          session_minutes: params.sessionMinutes,
          days_per_week: params.daysPerWeek,
          weeks: params.weeks,
          success_vision: (params.coachingResult as any)?.success_metric ?? '',
          coaching_result: params.coachingResult ?? null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const parts = [
          data.motivation_line,
          data.smart_goal,
          data.schedule,
          data.achievability,
        ].filter(Boolean)
        setSummary(parts.join(' '))
      }
    } catch {
      // Fallback handled below
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleConfirm = async () => {
    setGenerating(true)
    const expInt = experienceToInt(params.experience)
    try {
      const res = await fetch(`${API_BASE}/roadmap/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id ?? null,
          goal: GOAL_LABELS[params.goalType] ?? params.goalType,
          buddy_name: 'Garlic',
          experience: expInt,
          session_hours: params.sessionHours,
          session_minutes: params.sessionMinutes,
          days_per_week: params.daysPerWeek,
          weeks: params.weeks,
          success_vision: (params.coachingResult as any)?.success_metric ?? '',
          coaching_result: params.coachingResult ?? null,
          goal_type: params.goalType,
          grading_mode: params.gradingMode,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail ?? `Server error ${res.status}`)
      }
      const data = await res.json()
      const { roadmap_id, active_index, ...roadmapBody } = data
      navigation.navigate('Roadmap', {
        roadmap: roadmapBody,
        roadmapId: roadmap_id,
        initialActiveIndex: active_index ?? 0,
        goal: GOAL_LABELS[params.goalType] ?? params.goalType,
        experience: expInt,
        sessionHours: params.sessionHours,
        sessionMinutes: params.sessionMinutes,
        weeks: params.weeks,
        coachingResult: params.coachingResult ?? null,
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong.'
      Alert.alert('Could not build plan', message, [{ text: 'OK' }])
    } finally {
      setGenerating(false)
    }
  }

  const onPressIn = () =>
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  const arcRotate = arcSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const companionRotate = companionSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Loading screen while generating
  if (generating) {
    return (
      <Animated.View style={[styles.loadingContainer, { opacity: loadingFade }]}>
        {particleAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              PARTICLE_POSITIONS[i] as any,
              { opacity: anim, backgroundColor: PARTICLE_COLORS[i] },
            ]}
          />
        ))}
        <View style={styles.loadingCenter}>
          <View style={styles.arcWrapper}>
            <Animated.View style={[styles.arc, { transform: [{ rotate: arcRotate }] }]} />
            <View style={styles.companionInArc}>
              <Animated.View style={{ transform: [{ rotate: companionRotate }] }}>
                <MonkeyMascot size={72} mood="excited" />
              </Animated.View>
            </View>
          </View>
          <Text style={styles.loadingLabel}>Building your cooking plan...</Text>
          <Text style={styles.loadingSubLabel}>This takes about 15 seconds</Text>
        </View>
      </Animated.View>
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Back */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Companion */}
        <View style={styles.companionWrap}>
          <MonkeyMascot size={100} mood="excited" />
        </View>

        {/* Summary card */}
        <View style={[styles.summaryCard, shadows.peach]}>
          {loadingSummary ? (
            <Text style={styles.loadingText}>Putting your plan together...</Text>
          ) : (
            <Text style={styles.summaryText}>
              {summary ??
                `You're set to ${GOAL_LABELS[params.goalType] ?? 'level up your cooking'} — let's build your path.`}
            </Text>
          )}
        </View>

        {/* Confirm button */}
        <Animated.View style={[styles.btnWrap, { transform: [{ scale: buttonScale }] }]}>
          <Pressable
            onPress={handleConfirm}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={[styles.confirmBtn, shadows.mint]}
          >
            <Text style={styles.confirmBtnText}>Build my cooking plan</Text>
          </Pressable>
        </Animated.View>

        {/* Change something */}
        <Pressable onPress={() => navigation.goBack()} style={styles.changeLink}>
          <Text style={styles.changeLinkText}>Change something</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
  },
  companionWrap: {
    marginBottom: 24,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 24,
    marginBottom: 28,
  },
  loadingText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
  },
  summaryText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 26,
  },
  btnWrap: {
    width: '100%',
    marginBottom: 12,
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.foreground,
  },
  changeLink: {
    paddingVertical: 8,
  },
  changeLinkText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
  },

  // Loading screen
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenter: {
    alignItems: 'center',
  },
  arcWrapper: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  arc: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 5,
    borderTopColor: colors.mint,
    borderLeftColor: colors.mint,
    borderRightColor: colors.mint,
    borderBottomColor: 'transparent',
  },
  companionInArc: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
