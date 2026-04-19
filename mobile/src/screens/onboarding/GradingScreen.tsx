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
import Svg, { Path } from 'react-native-svg'
import MonkeyMascot from '../../components/MonkeyMascot'
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

// ── Options ───────────────────────────────────────────────────────────────────

const OPTIONS = [
  {
    slug: 'encouraging',
    title: 'Encouraging',
    description: 'Credit for trying, focus on what went well',
    xpLabel: 'Standard XP',
    xpIsBonus: false,
  },
  {
    slug: 'balanced',
    title: 'Balanced',
    description: 'Honest feedback, clear on what to improve',
    xpLabel: 'Standard XP',
    xpIsBonus: false,
  },
  {
    slug: 'strict',
    title: 'Strict',
    description: "Hold me to a high standard, don't let me off easy",
    xpLabel: 'Bonus XP',
    xpIsBonus: true,
  },
]

interface GradingParams {
  goalType: string
  experience: string
  sessionHours: number
  sessionMinutes: number
  daysPerWeek: number
  weeks: number
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function GradingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: GradingParams }, 'params'>>()
  const params = route.params

  const [selected, setSelected] = useState<string | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const continueOpacity = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  const handleSelect = (slug: string) => {
    const wasSelected = selected === slug
    setSelected(slug)
    if (!wasSelected) {
      Animated.timing(continueOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    }
  }

  const handleContinue = () => {
    if (!selected) return
    navigation.navigate('Coaching', { ...params, gradingMode: selected })
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
        {/* Back button */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Companion centered */}
        <View style={styles.companionWrap}>
          <MonkeyMascot size={80} mood="idle" />
        </View>

        <Text style={styles.headline}>How should Garlic grade your work?</Text>
        <Text style={styles.subheading}>You can always change this later.</Text>

        <View style={styles.optionsList}>
          {OPTIONS.map((opt) => (
            <GradingCard
              key={opt.slug}
              option={opt}
              isSelected={selected === opt.slug}
              onSelect={handleSelect}
            />
          ))}
        </View>

        <Animated.View style={[styles.continueWrap, { opacity: continueOpacity }]}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              onPress={handleContinue}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={[styles.continueBtn, shadows.mint]}
            >
              <Text style={styles.continueBtnText}>Continue →</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  )
}

// ── GradingCard ───────────────────────────────────────────────────────────────

function GradingCard({
  option,
  isSelected,
  onSelect,
}: {
  option: (typeof OPTIONS)[number]
  isSelected: boolean
  onSelect: (slug: string) => void
}) {
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.timing(scale, { toValue: 0.97, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => onSelect(option.slug)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.circle, isSelected && styles.circleSelected]} />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </View>
        </View>
        <Text style={[styles.xpLabel, option.xpIsBonus && styles.xpLabelBonus]}>
          {option.xpLabel}
        </Text>
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
    alignItems: 'center',
    marginBottom: 20,
  },
  headline: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 28,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.mint,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  circleSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.mint,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 2,
  },
  optionDescription: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  xpLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
    marginLeft: 8,
    flexShrink: 0,
  },
  xpLabelBonus: {
    color: colors.golden,
  },
  continueWrap: {
    marginTop: 28,
  },
  continueBtn: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.foreground,
  },
})
