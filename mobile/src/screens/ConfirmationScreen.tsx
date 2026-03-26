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

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

interface ConfirmationParams {
  goal: string
  buddyName: string
  experience: number
  sessionHours: number
  sessionMinutes: number
  daysPerWeek: number
  weeks: number
  successVision: string
  coachingResult?: object | null
}

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

const PARTICLE_POSITIONS: Array<{ top?: number | string; bottom?: number | string; left?: number | string; right?: number | string }> = [
  { top: '12%', left: '8%' },
  { top: '18%', right: '12%' },
  { top: '38%', left: '5%' },
  { top: '32%', right: '6%' },
  { bottom: '28%', left: '10%' },
  { bottom: '22%', right: '8%' },
  { bottom: '12%', left: '35%' },
  { top: '55%', right: '14%' },
]

export default function ConfirmationScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: ConfirmationParams }, 'params'>>()
  const params = route.params as ConfirmationParams
  const buttonScale = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [loading, setLoading] = useState(false)

  // Loading screen animations
  const arcSpin = useRef(new Animated.Value(0)).current
  const companionSpin = useRef(new Animated.Value(0)).current
  const loadingFade = useRef(new Animated.Value(0)).current
  const particleAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0.3))
  ).current

  const arcSpinRef = useRef<Animated.CompositeAnimation | null>(null)
  const companionSpinRef = useRef<Animated.CompositeAnimation | null>(null)
  const particleRefs = useRef<Animated.CompositeAnimation[]>([])

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  useEffect(() => {
    if (loading) {
      // Fade in loading screen
      loadingFade.setValue(0)
      Animated.timing(loadingFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      // Spinning arc
      arcSpin.setValue(0)
      arcSpinRef.current = Animated.loop(
        Animated.timing(arcSpin, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        })
      )
      arcSpinRef.current.start()

      // Companion slow spin
      companionSpin.setValue(0)
      companionSpinRef.current = Animated.loop(
        Animated.timing(companionSpin, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        })
      )
      companionSpinRef.current.start()

      // Staggered particle pulses
      particleRefs.current.forEach(a => a.stop())
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
      particleRefs.current.forEach(a => a.stop())
    }
  }, [loading])

  const arcRotate = arcSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const companionRotate = companionSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const onPressIn = () => {
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  }
  const onPressOut = () => {
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/roadmap/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: params.goal,
          buddy_name: params.buddyName,
          experience: params.experience,
          session_hours: params.sessionHours,
          session_minutes: params.sessionMinutes,
          days_per_week: params.daysPerWeek,
          weeks: params.weeks,
          success_vision: params.successVision,
          coaching_result: params.coachingResult ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail ?? `Server error ${res.status}`)
      }
      const roadmap = await res.json()
      navigation.navigate('Roadmap', { ...params, roadmap })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong.'
      Alert.alert('Could not build path', message, [{ text: 'OK' }])
    } finally {
      setLoading(false)
    }
  }

  // Loading screen
  if (loading) {
    return (
      <Animated.View style={[styles.loadingContainer, { opacity: loadingFade }]}>
        {/* Scattered particles */}
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

        {/* Center content */}
        <View style={styles.loadingCenter}>
          {/* Arc + Companion */}
          <View style={styles.arcWrapper}>
            <Animated.View
              style={[styles.arc, { transform: [{ rotate: arcRotate }] }]}
            />
            <View style={styles.companionInArc}>
              <Animated.View style={{ transform: [{ rotate: companionRotate }] }}>
                <Companion size={72} mood="excited" />
              </Animated.View>
            </View>
          </View>

          {/* Label */}
          <Text style={styles.loadingLabel}>
            <Text style={styles.sparkle}>✦ </Text>
            Tuning your goal...
          </Text>
          <Text style={styles.loadingSubLabel}>This takes about 15 seconds</Text>
        </View>
      </Animated.View>
    )
  }

  // Compute summary text
  const expLabel =
    params.experience <= 1
      ? 'total beginner'
      : params.experience <= 3
      ? 'having some experience'
      : 'being pretty confident'

  const totalMinutes = params.sessionHours * 60 + params.sessionMinutes
  const timeLabel = params.sessionHours > 0 && params.sessionMinutes > 0
    ? `${params.sessionHours}h ${params.sessionMinutes}m`
    : params.sessionHours > 0
    ? `${params.sessionHours} ${params.sessionHours === 1 ? 'hour' : 'hours'}`
    : `${params.sessionMinutes} minutes`

  const summaryText = `In ${params.weeks} weeks, you'll go from ${expLabel} to ${params.successVision || `mastering ${params.goal}`}, practicing ${params.daysPerWeek}x per week for ${timeLabel}.`

  const totalHoursPerWeek = (totalMinutes * params.daysPerWeek) / 60
  const achievabilityLabel =
    totalHoursPerWeek <= 7 ? '✅ Very Achievable' : '⚡ Ambitious but doable'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={styles.companionWrap}>
          <Companion size={80} mood="excited" />
        </View>

        <View style={[styles.summaryCard, shadows.peach]}>
          <Text style={styles.starEmoji}>⭐</Text>
          <Text style={styles.cardHeading}>Your Tuned Goal</Text>
          <Text style={styles.summaryText}>{summaryText}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{achievabilityLabel}</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <Pressable
            onPress={handleConfirm}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={[styles.confirmButton, shadows.mint]}
          >
            <Text style={styles.confirmButtonText}>
              This is my goal! Let's build my path →
            </Text>
          </Pressable>
        </Animated.View>

        <Pressable onPress={() => navigation.goBack()} style={styles.editLink}>
          <Text style={styles.editLinkText}>Retune</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  companionWrap: {
    marginBottom: 24,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFF4EC',
    borderRadius: radius.md,
    padding: 24,
    marginBottom: 24,
  },
  starEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardHeading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
    marginBottom: 12,
  },
  summaryText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mint + '33',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 17,
    color: colors.foreground,
    textAlign: 'center',
  },
  editLink: {
    paddingVertical: 8,
  },
  editLinkText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
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
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  sparkle: {
    color: colors.golden,
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
