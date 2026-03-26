import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'
const FIXED_STEPS = 5
const MAX_DYNAMIC_STEPS = 5

const fixedCompanionMoods: Array<'thinking' | 'idle' | 'excited' | 'happy'> = [
  'thinking',
  'idle',
  'idle',
  'excited',
  'happy',
]

const experienceOptions = [
  { value: 1, label: '1 (Beginner)' },
  { value: 2, label: '2' },
  { value: 3, label: '3 ' },
  { value: 4, label: '4' },
  { value: 5, label: '5 (Expert)' },
]

const durationOptions = [
  { value: 1, label: '1 Week' },
  { value: 2, label: '2 Weeks' },
  { value: 4, label: '1 Month' },
  { value: 8, label: '2 Months' },
  { value: 12, label: '3 Months' },
  { value: 24, label: '6 Months' },
  { value: 36, label: '9 Months' },
  { value: 52, label: '1 Year' },
]

interface DynamicStep {
  question: string
  answer: string
}

export default function GoalTuningScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: { goal: string; buddyName: string } }, 'params'>>()
  const { goal, buddyName } = route.params as { goal: string; buddyName: string }

  // Fixed step state
  const [step, setStep] = useState(0)
  const [experience, setExperience] = useState<number | null>(null)
  const [sessionHours, setSessionHours] = useState(0)
  const [sessionMinutes, setSessionMinutes] = useState(30)
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [weeks, setWeeks] = useState<number | null>(null)
  const [successVision, setSuccessVision] = useState('')

  // Dynamic coaching state
  const [dynamicSteps, setDynamicSteps] = useState<DynamicStep[]>([])
  const [currentDynamicAnswer, setCurrentDynamicAnswer] = useState('')
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([])
  const [loadingCoach, setLoadingCoach] = useState(false)

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current
  const dropAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  // Loading dots animation
  const dot1 = useRef(new Animated.Value(0.3)).current
  const dot2 = useRef(new Animated.Value(0.3)).current
  const dot3 = useRef(new Animated.Value(0.3)).current
  const dotLoops = useRef<Animated.CompositeAnimation[]>([])

  useEffect(() => {
    if (loadingCoach) {
      dotLoops.current.forEach(l => l.stop())
      dotLoops.current = [dot1, dot2, dot3].map((anim, i) => {
        anim.setValue(0.3)
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ])
        )
        setTimeout(() => loop.start(), i * 200)
        return loop
      })
    } else {
      dotLoops.current.forEach(l => l.stop())
      dot1.setValue(0.3)
      dot2.setValue(0.3)
      dot3.setValue(0.3)
    }
  }, [loadingCoach])

  const animateToStep = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dropAnim, {
        toValue: 16,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep)
      dropAnim.setValue(0)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })
  }

  // Fade in on mount
  useEffect(() => {
    fadeAnim.setValue(0)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  const navigateToConfirmation = (coachingResult: object | null) => {
    navigation.navigate('Confirmation', {
      goal,
      buddyName,
      experience: experience!,
      sessionHours,
      sessionMinutes,
      daysPerWeek,
      weeks: weeks!,
      successVision: successVision.trim(),
      coachingResult,
    })
  }

  // -----------------------------------------------------------------------
  // Coaching API
  // -----------------------------------------------------------------------

  const callCoach = async (history: Array<{ role: string; content: string }>, currentDynamic: DynamicStep[]) => {
    setLoadingCoach(true)
    try {
      const res = await fetch(`${API_BASE}/roadmap/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          buddy_name: buddyName,
          conversation_history: history,
          experience,
          session_minutes: (sessionHours ?? 0) * 60 + (sessionMinutes ?? 0),
          days_per_week: daysPerWeek,
          weeks,
          success_vision: successVision.trim(),
        }),
      })
      if (!res.ok) throw new Error('Coach error')
      const data = await res.json()

      if (data.ready || currentDynamic.length >= MAX_DYNAMIC_STEPS) {
        navigateToConfirmation(data.coaching_result ?? null)
      } else {
        const newDynamic = [...currentDynamic, { question: data.message, answer: '' }]
        setDynamicSteps(newDynamic)
        setCurrentDynamicAnswer('')
        setLoadingCoach(false)
        animateToStep(FIXED_STEPS + newDynamic.length - 1)
      }
    } catch {
      // On error, skip coaching gracefully
      setLoadingCoach(false)
      navigateToConfirmation(null)
    }
  }

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleExperienceSelect = (val: number) => {
    setExperience(val)
    setTimeout(() => animateToStep(1), 200)
  }

  const handleDurationSelect = (val: number) => {
    setWeeks(val)
    setTimeout(() => animateToStep(4), 200)
  }

  const handleFinish = () => {
    if (!successVision.trim()) return
    // Kick off coaching flow
    const initialHistory = [{ role: 'user', content: successVision.trim() }]
    setConversationHistory(initialHistory)
    callCoach(initialHistory, [])
  }

  const handleDynamicContinue = () => {
    if (!currentDynamicAnswer.trim() || loadingCoach) return
    const answer = currentDynamicAnswer.trim()
    const dynamicIndex = step - FIXED_STEPS

    // Update step answer
    const updatedDynamic = [...dynamicSteps]
    updatedDynamic[dynamicIndex] = { ...updatedDynamic[dynamicIndex], answer }
    setDynamicSteps(updatedDynamic)

    // Update conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: 'assistant', content: dynamicSteps[dynamicIndex].question },
      { role: 'user', content: answer },
    ]
    setConversationHistory(updatedHistory)
    setCurrentDynamicAnswer('')
    callCoach(updatedHistory, updatedDynamic)
  }

  const handleSkipCoaching = () => {
    navigateToConfirmation(null)
  }

  const canAdvance = () => {
    if (step === 0) return experience !== null
    if (step === 1) return sessionHours > 0 || sessionMinutes > 0
    if (step === 2) return true
    if (step === 3) return weeks !== null
    if (step === 4) return !!successVision.trim()
    if (step >= FIXED_STEPS) return !!currentDynamicAnswer.trim()
    return false
  }

  const onPressIn = () => {
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  }
  const onPressOut = () => {
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()
  }

  const currentMood = (): 'thinking' | 'idle' | 'excited' | 'happy' => {
    if (loadingCoach) return 'thinking'
    if (step < FIXED_STEPS) return fixedCompanionMoods[step]
    return 'happy'
  }

  // -----------------------------------------------------------------------
  // Step rendering
  // -----------------------------------------------------------------------

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={styles.question}>What's your experience level?</Text>
            <View style={styles.pillColumn}>
              {experienceOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => handleExperienceSelect(opt.value)}
                  style={[
                    styles.pill,
                    experience === opt.value
                      ? [styles.pillActive, shadows.mint]
                      : styles.pillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      experience === opt.value && styles.pillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )
      case 1:
        return (
          <>
            <Text style={styles.question}>How much time per day?</Text>
            <View style={styles.dualPickerRow}>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerLabel}>Hours</Text>
                <View style={styles.pickerControls}>
                  <Pressable
                    onPress={() => setSessionHours(Math.max(0, sessionHours - 1))}
                    style={styles.pickerButton}
                  >
                    <Text style={styles.pickerButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.pickerValue}>{sessionHours}</Text>
                  <Pressable
                    onPress={() => setSessionHours(Math.min(8, sessionHours + 1))}
                    style={styles.pickerButton}
                  >
                    <Text style={styles.pickerButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerLabel}>Minutes</Text>
                <View style={styles.pickerControls}>
                  <Pressable
                    onPress={() => setSessionMinutes(Math.max(0, sessionMinutes - 15))}
                    style={styles.pickerButton}
                  >
                    <Text style={styles.pickerButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.pickerValue}>{sessionMinutes}</Text>
                  <Pressable
                    onPress={() => setSessionMinutes(Math.min(45, sessionMinutes + 15))}
                    style={styles.pickerButton}
                  >
                    <Text style={styles.pickerButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <Text style={styles.pickerSummary}>
              {sessionHours > 0 ? `${sessionHours}h ` : ''}{sessionMinutes > 0 ? `${sessionMinutes}m` : sessionHours > 0 ? '' : '0m'} per session
            </Text>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={() => animateToStep(2)}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={sessionHours === 0 && sessionMinutes === 0}
                style={[
                  styles.stepButton,
                  shadows.mint,
                  sessionHours === 0 && sessionMinutes === 0 && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.stepButtonText}>Confirm →</Text>
              </Pressable>
            </Animated.View>
          </>
        )
      case 2:
        return (
          <>
            <Text style={styles.question}>How many days per week?</Text>
            <View style={styles.sliderWrap}>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={1}
                maximumValue={7}
                step={1}
                value={daysPerWeek}
                onValueChange={setDaysPerWeek}
                minimumTrackTintColor={colors.mint}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.mint}
              />
              <Text style={styles.sliderValue}>{daysPerWeek} {daysPerWeek === 1 ? 'day' : 'days'}/week</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={() => animateToStep(3)}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[styles.stepButton, shadows.mint]}
              >
                <Text style={styles.stepButtonText}>Confirm →</Text>
              </Pressable>
            </Animated.View>
          </>
        )
      case 3:
        return (
          <>
            <Text style={styles.question}>How long do you want to work toward this?</Text>
            <View style={styles.pillGrid}>
              {durationOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => handleDurationSelect(opt.value)}
                  style={[
                    styles.pillGridItem,
                    weeks === opt.value
                      ? [styles.pillActive, shadows.mint]
                      : styles.pillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      weeks === opt.value && styles.pillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )
      case 4:
        return (
          <>
            <Text style={styles.question}>What does success feel like to you?</Text>
            <TextInput
              style={styles.textArea}
              value={successVision}
              onChangeText={setSuccessVision}
              placeholder="e.g. Hold a real conversation in Spanish…"
              placeholderTextColor={colors.muted + '99'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={handleFinish}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={!successVision.trim() || loadingCoach}
                style={[
                  styles.stepButton,
                  shadows.mint,
                  (!successVision.trim() || loadingCoach) && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.stepButtonText}>Continue →</Text>
              </Pressable>
            </Animated.View>
          </>
        )
      default: {
        // Dynamic coaching steps
        const dynamicIndex = step - FIXED_STEPS
        const dynStep = dynamicSteps[dynamicIndex]

        if (loadingCoach || !dynStep) {
          return (
            <>
              <Text style={styles.question}>Thinking of a question...</Text>
              <View style={styles.loadingDots}>
                <Animated.View style={[styles.loadingDot, { opacity: dot1 }]} />
                <Animated.View style={[styles.loadingDot, { opacity: dot2 }]} />
                <Animated.View style={[styles.loadingDot, { opacity: dot3 }]} />
              </View>
            </>
          )
        }

        return (
          <>
            <Text style={styles.question}>{dynStep.question}</Text>
            <TextInput
              style={styles.textArea}
              value={currentDynamicAnswer}
              onChangeText={setCurrentDynamicAnswer}
              placeholder="Type your answer…"
              placeholderTextColor={colors.muted + '99'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={handleDynamicContinue}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={!currentDynamicAnswer.trim() || loadingCoach}
                style={[
                  styles.stepButton,
                  shadows.mint,
                  (!currentDynamicAnswer.trim() || loadingCoach) && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.stepButtonText}>Continue →</Text>
              </Pressable>
            </Animated.View>
          </>
        )
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Goal Tuning ✨</Text>
      <Text style={styles.subheading}>
        Let's make your goal something you can actually crush.
      </Text>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: FIXED_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              step >= FIXED_STEPS
                ? styles.dotPast
                : i === step
                ? styles.dotActive
                : i < step
                ? styles.dotPast
                : styles.dotFuture,
            ]}
          />
        ))}
        {step >= FIXED_STEPS && (
          <Text style={styles.almostThere}>Almost there...</Text>
        )}
      </View>

      {/* Step card */}
      <Animated.View
        style={[
          styles.stepCard,
          { opacity: fadeAnim, transform: [{ translateY: dropAnim }] },
        ]}
      >
        {/* Companion in top-right */}
        <View style={styles.companionCorner}>
          <Companion size={56} mood={currentMood()} />
        </View>
        {renderStep()}
      </Animated.View>

      {/* Navigation arrows */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => {
            if (loadingCoach) return
            if (step > 0 && step < FIXED_STEPS) {
              animateToStep(step - 1)
            } else if (step === 0) {
              navigation.goBack()
            } else if (step >= FIXED_STEPS) {
              // Back from dynamic step → go to last fixed step
              setDynamicSteps([])
              setConversationHistory([])
              setCurrentDynamicAnswer('')
              animateToStep(4)
            }
          }}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>← Back</Text>
        </Pressable>
        {step >= FIXED_STEPS && !loadingCoach ? (
          <Pressable onPress={handleSkipCoaching} style={styles.navArrow}>
            <Text style={styles.navArrowText}>Skip →</Text>
          </Pressable>
        ) : step < FIXED_STEPS - 1 && canAdvance() ? (
          <Pressable
            onPress={() => animateToStep(step + 1)}
            style={styles.navArrow}
          >
            <Text style={styles.navArrowText}>Next →</Text>
          </Pressable>
        ) : step === FIXED_STEPS - 1 ? (
          <View />
        ) : (
          <View style={[styles.navArrow, { opacity: 0.3 }]}>
            <Text style={styles.navArrowText}>Next →</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  heading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 26,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 4,
  },
  subheading: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotActive: {
    backgroundColor: colors.mint,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotPast: {
    backgroundColor: colors.mint,
    opacity: 0.5,
  },
  dotFuture: {
    backgroundColor: colors.border,
  },
  almostThere: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
    marginLeft: 4,
  },
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 24,
    flex: 1,
    maxHeight: 420,
  },
  companionCorner: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  question: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 20,
    paddingRight: 64,
  },
  pillColumn: {
    gap: 12,
  },
  pill: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  pillActive: {
    backgroundColor: colors.mint,
  },
  pillInactive: {
    backgroundColor: colors.border,
  },
  pillText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.foreground,
  },
  pillTextActive: {
    color: colors.white,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pillGridItem: {
    width: '47%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  dualPickerRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pickerBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  pickerLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
  },
  pickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pickerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.white,
    lineHeight: 24,
  },
  pickerValue: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 32,
    color: colors.foreground,
    minWidth: 40,
    textAlign: 'center',
  },
  pickerSummary: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  sliderWrap: {
    marginTop: 16,
    marginBottom: 24,
  },
  sliderValue: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 28,
    color: colors.foreground,
    textAlign: 'center',
    marginTop: 12,
  },
  textArea: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.foreground,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 100,
    marginBottom: 20,
    backgroundColor: colors.background,
  },
  stepButton: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stepButtonText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mint,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  navArrow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navArrowText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.muted,
  },
})
