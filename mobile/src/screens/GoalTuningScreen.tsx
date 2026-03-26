import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const TOTAL_STEPS = 5

const companionMoods: Array<'thinking' | 'idle' | 'idle' | 'excited' | 'happy'> = [
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
  { value: 2, label: '2 Weeks' },
  { value: 4, label: '1 Month' },
  { value: 12, label: '3 Months' },
  { value: 24, label: '6 Months' },
]

export default function GoalTuningScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: { goal: string; buddyName: string } }, 'params'>>()
  const { goal, buddyName } = route.params as { goal: string; buddyName: string }

  const [step, setStep] = useState(0)
  const [experience, setExperience] = useState<number | null>(null)
  const [sessionHours, setSessionHours] = useState(0)
  const [sessionMinutes, setSessionMinutes] = useState(30)
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [weeks, setWeeks] = useState<number | null>(null)
  const [successVision, setSuccessVision] = useState('')

  const fadeAnim = useRef(new Animated.Value(1)).current
  const dropAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const animateToStep = (nextStep: number) => {
    // Fade out + drop down
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
      // Fade in
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
    navigation.navigate('Confirmation', {
      goal,
      buddyName,
      experience: experience!,
      sessionHours,
      sessionMinutes,
      daysPerWeek,
      weeks: weeks!,
      successVision: successVision.trim(),
    })
  }

  const canAdvance = () => {
    if (step === 0) return experience !== null
    if (step === 1) return sessionHours > 0 || sessionMinutes > 0
    if (step === 2) return true
    if (step === 3) return weeks !== null
    if (step === 4) return !!successVision.trim()
    return false
  }

  const onPressIn = () => {
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  }
  const onPressOut = () => {
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()
  }

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
              {/* Hours picker */}
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
              {/* Minutes picker */}
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
                disabled={!successVision.trim()}
                style={[
                  styles.stepButton,
                  shadows.mint,
                  !successVision.trim() && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.stepButtonText}>Continue →</Text>
              </Pressable>
            </Animated.View>
          </>
        )
      default:
        return null
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
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step
                ? styles.dotActive
                : i < step
                ? styles.dotPast
                : styles.dotFuture,
            ]}
          />
        ))}
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
          <Companion size={56} mood={companionMoods[step]} />
        </View>
        {renderStep()}
      </Animated.View>

      {/* Navigation arrows */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => {
            if (step > 0) {
              animateToStep(step - 1)
            } else {
              navigation.goBack()
            }
          }}
          style={styles.navArrow}
        >
          <Text style={styles.navArrowText}>← Back</Text>
        </Pressable>
        {step < TOTAL_STEPS - 1 && canAdvance() ? (
          <Pressable
            onPress={() => animateToStep(step + 1)}
            style={styles.navArrow}
          >
            <Text style={styles.navArrowText}>Next →</Text>
          </Pressable>
        ) : step === TOTAL_STEPS - 1 ? (
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
