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

// ── Options ───────────────────────────────────────────────────────────────────

const OPTIONS = [
  {
    slug: 'beginner',
    title: 'Starting from zero',
    description: "I'm not confident in the kitchen yet",
  },
  {
    slug: 'intermediate',
    title: 'Getting there',
    description: "I can follow a recipe but I don't understand why things work",
  },
  {
    slug: 'advanced',
    title: 'Cooking regularly',
    description: 'I want to level up specific weak spots',
  },
]

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ExperienceScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: { goalType: string } }, 'params'>>()
  const { goalType } = route.params

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
    navigation.navigate('Commitment', { goalType, experience: selected })
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
            <Companion size={70} mood="thinking" />
          </View>
        </View>

        <Text style={styles.headline}>Where are you right now?</Text>

        <View style={styles.optionsList}>
          {OPTIONS.map((opt) => (
            <OptionCard
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

// ── OptionCard ────────────────────────────────────────────────────────────────

function OptionCard({
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
        <View style={[styles.circle, isSelected && styles.circleSelected]} />
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
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
    marginBottom: 32,
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
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.mint,
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
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
  },
})
