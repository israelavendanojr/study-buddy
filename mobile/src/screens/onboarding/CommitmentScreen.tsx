import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import Companion from '../../components/Companion'
import { colors, radius, shadows } from '../../theme'

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

// ── Duration options ──────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 1, label: '1 Week' },
  { value: 2, label: '2 Weeks' },
  { value: 4, label: '1 Month' },
  { value: 8, label: '2 Months' },
  { value: 12, label: '3 Months' },
  { value: 24, label: '6 Months' },
  // { value: 36, label: '9 Months' },
  // { value: 52, label: '1 Year' },
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

  const [sessionHours, setSessionHours] = useState(0)
  const [sessionMinutes, setSessionMinutes] = useState(30)
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [weeks, setWeeks] = useState<number | null>(null)

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
    if (!weeks) return
    navigation.navigate('Grading', {
      goalType,
      experience,
      sessionHours,
      sessionMinutes,
      daysPerWeek,
      weeks,
    })
  }

  const onPressIn = () =>
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  const timeLabel =
    sessionHours > 0 && sessionMinutes > 0
      ? `${sessionHours}h ${sessionMinutes}m`
      : sessionHours > 0
      ? `${sessionHours}h`
      : sessionMinutes > 0
      ? `${sessionMinutes}m`
      : '0m'

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

        <Text style={styles.headline}>How much time can you give this?</Text>

        {/* Main card */}
        <View style={styles.card}>
          {/* Section 1: Time per session */}
          <Text style={styles.sectionLabel}>TIME PER SESSION</Text>
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

          <Text style={styles.timeSummary}>{timeLabel} per session</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section 2: Days per week */}
          <Text style={styles.sectionLabel}>DAYS PER WEEK</Text>
          <View style={styles.sliderWrap}>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={1}
              maximumValue={7}
              step={1}
              value={daysPerWeek}
              onValueChange={(v) => setDaysPerWeek(v)}
              minimumTrackTintColor={colors.mint}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.mint}
            />
            <Text style={styles.sliderValue}>
              {daysPerWeek} {daysPerWeek === 1 ? 'day' : 'days'} / week
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section 3: Duration */}
          <Text style={styles.sectionLabel}>HOW LONG DO YOU WANT TO WORK TOWARD THIS?</Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((opt) => (
              <DurationPill
                key={opt.value}
                label={opt.label}
                value={opt.value}
                isSelected={weeks === opt.value}
                onSelect={(v) => setWeeks(v)}
              />
            ))}
          </View>
        </View>

        {/* Continue button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPress={handleContinue}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={!weeks}
            style={[styles.continueBtn, shadows.mint, !weeks && styles.continueBtnDisabled]}
          >
            <Text style={styles.continueBtnText}>Continue →</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  )
}

// ── DurationPill ──────────────────────────────────────────────────────────────

function DurationPill({
  label,
  value,
  isSelected,
  onSelect,
}: {
  label: string
  value: number
  isSelected: boolean
  onSelect: (v: number) => void
}) {
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.timing(scale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  return (
    <Animated.View style={[styles.pillWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => onSelect(value)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.pill, isSelected && styles.pillSelected]}
      >
        <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{label}</Text>
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
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  dualPickerRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  pickerBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
  },
  pickerLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
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
    color: colors.foreground,
    lineHeight: 24,
  },
  pickerValue: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 32,
    color: colors.foreground,
    minWidth: 40,
    textAlign: 'center',
  },
  timeSummary: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sliderWrap: {
    marginBottom: 4,
  },
  sliderValue: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 28,
    color: colors.foreground,
    textAlign: 'center',
    marginTop: 8,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pillWrapper: {
    width: '47%',
  },
  pill: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  pillSelected: {
    backgroundColor: colors.mint,
  },
  pillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.foreground,
  },
  pillTextSelected: {
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
