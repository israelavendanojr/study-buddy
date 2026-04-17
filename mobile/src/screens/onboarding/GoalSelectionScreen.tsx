import React, { useRef, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native'
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Companion from '../../components/Companion'
import { colors, radius } from '../../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

// ── Icons ─────────────────────────────────────────────────────────────────────

function PanIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 8h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 8v8"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M19 12h3"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function HouseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10L12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10z"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V12h6v9"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function KnifeIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 21L18 9c1-1 1-3 0-4s-3-1-4 0L3 16"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 16l2 2-1 3"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ClocheIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C7 3 3 7 3 12h18c0-5-4-9-9-9z"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 3V1"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function DropletIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2z"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function GlobeIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.foreground} strokeWidth={1.8} />
      <Path
        d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={colors.foreground} strokeWidth={1.8} />
    </Svg>
  )
}

// ── Goal options ───────────────────────────────────────────────────────────────

const GOALS = [
  {
    slug: 'learn_from_scratch',
    title: 'Learn to cook from scratch',
    description: 'Build real skills from the ground up',
    Icon: PanIcon,
  },
  {
    slug: 'cook_better',
    title: 'Cook better at home',
    description: 'Understand why your food tastes the way it does',
    Icon: HouseIcon,
  },
  {
    slug: 'skill_focus',
    title: 'Master a specific skill',
    description: 'Knife work, sauces, heat control, flavor',
    Icon: KnifeIcon,
  },
  {
    slug: 'host_impress',
    title: 'Cook for others',
    description: 'Dinner parties, dates, cooking for people you care about',
    Icon: ClocheIcon,
  },
  {
    slug: 'understand_flavor',
    title: 'Understand flavor',
    description: 'Learn to season, balance, and taste like a cook',
    Icon: DropletIcon,
  },
  {
    slug: 'cuisine_focus',
    title: 'Learn a cuisine',
    description: 'Italian, Asian, French — more coming soon',
    Icon: GlobeIcon,
  },
]

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function GoalSelectionScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  const handleSelect = (slug: string) => {
    navigation.navigate('Experience', { goalType: slug })
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.companionWrap}>
          <Companion size={80} mood="happy" />
        </View>
        <Text style={styles.headline}>What would you like to accomplish?</Text>
        <Text style={styles.subheading}>Pick the one that fits best right now.</Text>

        <View style={styles.grid}>
          {GOALS.map((goal) => (
            <GoalCard key={goal.slug} goal={goal} onSelect={handleSelect} />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  )
}

// ── GoalCard ──────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onSelect,
}: {
  goal: (typeof GOALS)[number]
  onSelect: (slug: string) => void
}) {
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.timing(scale, { toValue: 0.97, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => onSelect(goal.slug)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
      >
        <View style={styles.cardIcon}>
          <goal.Icon />
        </View>
        <Text style={styles.cardTitle}>{goal.title}</Text>
        <Text style={styles.cardDescription}>{goal.description}</Text>
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
    paddingTop: 64,
    paddingBottom: 40,
  },
  inner: {
    alignItems: 'center',
  },
  companionWrap: {
    marginBottom: 16,
  },
  headline: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 26,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 28,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    width: '47.5%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    minHeight: 130,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
})
