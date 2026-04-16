import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Svg, {
  Circle,
  Ellipse,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../../components/Companion'
import TabBar from '../../components/TabBar'
import { colors, radius, shadows } from '../../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

// ── Icons ──────────────────────────────────────────────────────────────────────

function CogIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={colors.foreground} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={colors.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

type CompanionMood = 'idle' | 'happy' | 'excited' | 'thinking' | 'sad'

interface CompanionData {
  level: number
  xp: number
  xp_to_next_level: number
  xp_progress_pct: number
  mood: number
  streak_days: number
  last_practice_date: string | null
  next_milestone: number
}

interface IncompleteMission {
  lesson_key: string
  lesson_title: string
  chapter_title: string
  domain: string
  goal: string
  buddy_name: string
  experience: number
  mission_id: string
  mission_title: string
  mission_description: string
  is_required: boolean
  duration_minutes: number
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function moodToCompanionMood(mood: number): CompanionMood {
  if (mood <= 40) return 'sad'
  if (mood <= 70) return 'idle'
  return 'happy'
}

function getMoodBarColor(mood: number): string {
  if (mood <= 20) return '#FF6B6B'
  if (mood <= 40) return '#FFB347'
  if (mood <= 60) return '#FFD166'
  if (mood <= 85) return colors.mint
  return '#5CCB8F'
}

function getXpLabel(data: CompanionData): string {
  return `${data.xp}/${data.xp_to_next_level} XP`
}

function getDotColor(isRequired: boolean): string {
  return isRequired ? colors.mint : colors.muted
}

// ── Room Scene ─────────────────────────────────────────────────────────────────

function RoomScene({ children }: { children: React.ReactNode }) {
  return (
    <View style={roomStyles.container}>
      <Svg width="100%" height={260} viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
        {/* Wall */}
        <Rect width={400} height={260} fill="#FFF8EE" />

        {/* Floor */}
        <Path d="M0 185 L400 185 L400 260 L0 260Z" fill="#B8E6D0" />
        <Path d="M0 185 L400 185 L400 196 L0 196Z" fill="#A0D4B8" opacity={0.5} />

        {/* Round window behind companion */}
        <Circle cx={200} cy={78} r={48} fill="#B8D8F8" opacity={0.55} />
        <Circle cx={200} cy={78} r={48} fill="none" stroke="#EDE7DF" strokeWidth={5} />
        <Line x1={200} y1={30} x2={200} y2={126} stroke="#EDE7DF" strokeWidth={2.5} />
        <Line x1={152} y1={78} x2={248} y2={78} stroke="#EDE7DF" strokeWidth={2.5} />
        {/* Clouds in window */}
        <Circle cx={183} cy={62} r={8} fill="white" opacity={0.5} />
        <Circle cx={213} cy={58} r={6} fill="white" opacity={0.4} />

        {/* Lamp — left */}
        <Rect x={55} y={98} width={6} height={88} rx={3} fill="#D4A574" />
        <Path d="M40 98 Q58 78, 76 98 Z" fill="#FFE082" opacity={0.9} />
        <Circle cx={58} cy={93} r={20} fill="#FFE082" opacity={0.12} />

        {/* Nest / floor pad under companion */}
        <Ellipse cx={200} cy={225} rx={52} ry={17} fill="#D4A574" opacity={0.55} />
        <Ellipse cx={200} cy={221} rx={47} ry={13} fill="#E8C9A0" />
        <Ellipse cx={200} cy={219} rx={42} ry={9} fill="#F0D9B5" />

        {/* Plant — right */}
        <Rect x={318} y={168} width={16} height={22} rx={4} fill="#D4A574" />
        <Circle cx={326} cy={160} r={14} fill="#A8E6C3" opacity={0.75} />
        <Circle cx={320} cy={155} r={10} fill="#8BD4A8" opacity={0.6} />

        {/* Tiny rug — left */}
        <Ellipse cx={110} cy={236} rx={28} ry={9} fill="#FFCBA4" opacity={0.4} />

        {/* Wall stars */}
        <Circle cx={95} cy={48} r={2} fill="#FFE082" opacity={0.5} />
        <Circle cx={308} cy={38} r={1.5} fill="#FFE082" opacity={0.4} />
        <Circle cx={338} cy={68} r={2} fill="#FFE082" opacity={0.3} />
      </Svg>

      {/* Floor shadow under companion */}
      <View style={roomStyles.companionWrapper}>
        <View style={roomStyles.shadowEllipse} />
        {children}
      </View>
    </View>
  )
}

const roomStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  companionWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  shadowEllipse: {
    width: 90,
    height: 18,
    borderRadius: 45,
    backgroundColor: 'rgba(180,140,100,0.18)',
    position: 'absolute',
    bottom: -6,
  },
})

// ── Radial Ring ────────────────────────────────────────────────────────────────

const RING_R = 30
const RING_STROKE = 7
const RING_SIZE = (RING_R + RING_STROKE + 2) * 2
const CIRCUMFERENCE = 2 * Math.PI * RING_R

interface RadialRingProps {
  progress: number   // 0–1
  color: string
  centerLabel: string
  bottomLabel: string
  subLabel?: string
}

function RadialRing({ progress, color, centerLabel, bottomLabel, subLabel }: RadialRingProps) {
  const dash = Math.max(0, Math.min(1, progress)) * CIRCUMFERENCE
  const cx = RING_SIZE / 2
  const cy = RING_SIZE / 2

  return (
    <View style={ringStyles.wrapper}>
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Background track */}
          <Circle
            cx={cx}
            cy={cy}
            r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeOpacity={0.18}
          />
          {/* Progress arc — rotated -90° so it starts from top */}
          <Circle
            cx={cx}
            cy={cy}
            r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform={`rotate(-90, ${cx}, ${cy})`}
          />
          {/* Center label — y offset ~5 for visual centering without dominantBaseline */}
          <SvgText
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            fontFamily="FredokaOne_400Regular"
            fontSize={13}
            fill={colors.foreground}
          >
            {centerLabel}
          </SvgText>
        </Svg>
      </View>
      <Text style={ringStyles.bottomLabel}>{bottomLabel}</Text>
      {subLabel ? <Text style={ringStyles.subLabel}>{subLabel}</Text> : null}
    </View>
  )
}

const ringStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  bottomLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.foreground,
    textAlign: 'center',
  },
  subLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
  },
})

// ── Mission Card ───────────────────────────────────────────────────────────────

function MissionCard({ mission, onPress }: { mission: IncompleteMission; onPress: () => void }) {
  const dotColor = getDotColor(mission.is_required)

  return (
    <Pressable style={({ pressed }) => [missionStyles.card, pressed && { opacity: 0.75 }]} onPress={onPress}>
      {/* Left dot */}
      <View style={[missionStyles.dot, { backgroundColor: dotColor }]} />

      {/* Title */}
      <Text style={missionStyles.title} numberOfLines={2}>{mission.mission_title}</Text>

      {/* XP badge */}
      <View style={missionStyles.xpBadge}>
        <Svg width={12} height={12} viewBox="0 0 16 16">
          <Path d="M8 1L10 6H15L11 9.5L12.5 15L8 11.5L3.5 15L5 9.5L1 6H6Z" fill={colors.golden} />
        </Svg>
        <Text style={missionStyles.xpText}>20</Text>
      </View>

      {/* Chevron */}
      <Svg width={16} height={16} viewBox="0 0 16 16" style={{ marginLeft: 2 }}>
        <Path d="M6 4l4 4-4 4" stroke={colors.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressable>
  )
}

const missionStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
  },
  title: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
  },
  lessonLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  xpText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.foreground,
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
})

// ── Component ──────────────────────────────────────────────────────────────────

export default function CompanionHomeScreen() {
  const { user } = useUser()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const isFocused = useIsFocused()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [data, setData] = useState<CompanionData | null>(null)
  const [missions, setMissions] = useState<IncompleteMission[]>([])

  // XP bar: driven by pixel width, resolved after container lays out
  const xpBarAnim = useRef(new Animated.Value(0)).current
  const xpBarContainerWidth = useRef(0)
  const prevXpPct = useRef(-1)

  // Companion bounce when mood changes between fetches
  const companionScale = useRef(new Animated.Value(1)).current
  const prevMood = useRef<number | null>(null)

  // Skip focus-refetch on the very first render (initial fetch handles it)
  const isMounted = useRef(false)

  // ── Fetch companion ───────────────────────────────────────────────────────────

  const fetchCompanion = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const [statsRes, progressRes] = await Promise.all([
        fetch(`${API_BASE}/companion/${user.id}/stats`),
        fetch(`${API_BASE}/companion/${user.id}/progress`),
      ])

      if (statsRes.status === 404 || progressRes.status === 404) {
        setNotFound(true)
        return
      }
      if (!statsRes.ok || !progressRes.ok) throw new Error('Server error')

      const [stats, progress] = await Promise.all([statsRes.json(), progressRes.json()])

      setData({
        level: progress.level,
        xp: progress.xp,
        xp_to_next_level: progress.xp_to_next_level,
        xp_progress_pct: progress.xp_progress_pct,
        mood: stats.mood,
        streak_days: stats.streak_days,
        last_practice_date: stats.last_practice_date,
        next_milestone: progress.next_milestone,
      })
    } catch {
      setError("Can't load companion. Tap to retry.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  // ── Fetch incomplete missions ─────────────────────────────────────────────────

  const fetchRoadmap = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`${API_BASE}/lesson/user/${user.id}/missions`)
      if (!res.ok) return
      const data: IncompleteMission[] = await res.json()
      setMissions(data)
    } catch {
      // Silently ignore — missions section shows fallback
    }
  }, [user])

  // Initial load
  useEffect(() => {
    fetchCompanion()
    fetchRoadmap()
    isMounted.current = true
  }, [fetchCompanion, fetchRoadmap])

  // Refetch silently when screen regains focus
  useEffect(() => {
    if (!isMounted.current) return
    if (isFocused) {
      fetchCompanion(true)
      fetchRoadmap()
    }
  }, [isFocused])

  // ── XP bar animation ──────────────────────────────────────────────────────────

  function animateXpBar(pct: number, containerWidth: number, animate: boolean) {
    const targetWidth = (pct / 100) * containerWidth
    if (animate) {
      Animated.timing(xpBarAnim, {
        toValue: targetWidth,
        duration: 600,
        useNativeDriver: false,
      }).start()
    } else {
      xpBarAnim.setValue(targetWidth)
    }
  }

  useEffect(() => {
    if (!data || xpBarContainerWidth.current === 0) return
    if (prevXpPct.current === data.xp_progress_pct) return
    const shouldAnimate = prevXpPct.current !== -1
    animateXpBar(data.xp_progress_pct, xpBarContainerWidth.current, shouldAnimate)
    prevXpPct.current = data.xp_progress_pct
  }, [data?.xp, data?.level])

  // ── Companion bounce on mood change ───────────────────────────────────────────

  useEffect(() => {
    if (!data) return
    if (prevMood.current !== null && prevMood.current !== data.mood) {
      Animated.sequence([
        Animated.timing(companionScale, { toValue: 1.14, duration: 140, useNativeDriver: true }),
        Animated.spring(companionScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start()
    }
    prevMood.current = data.mood
  }, [data?.mood])

  // ── Initialize ────────────────────────────────────────────────────────────────

  async function handleInitialize() {
    if (!user) return
    setInitializing(true)
    try {
      const res = await fetch(`${API_BASE}/companion/${user.id}/initialize`, { method: 'POST' })
      if (res.ok || res.status === 400) {
        await fetchCompanion()
      } else {
        setError('Failed to create companion. Try again.')
      }
    } catch {
      setError("Can't connect to server.")
    } finally {
      setInitializing(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Companion size={120} mood="thinking" />
          <ActivityIndicator color={colors.mint} style={{ marginTop: 24 }} />
          <Text style={styles.loadingText}>Waking up your buddy…</Text>
        </View>
        <TabBar activeTab="home" />
      </View>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Companion size={110} mood="sad" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={[styles.primaryButton, shadows.mint]} onPress={() => fetchCompanion()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
        <TabBar activeTab="home" />
      </View>
    )
  }

  // ── Not-found state ───────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Companion size={140} mood="idle" />
          <Text style={styles.notFoundTitle}>Meet your buddy!</Text>
          <Text style={styles.notFoundSubtitle}>
            Your companion is waiting to join you on your learning journey.
          </Text>
          <Pressable
            style={[styles.primaryButton, shadows.mint, initializing && { opacity: 0.6 }]}
            onPress={handleInitialize}
            disabled={initializing}
          >
            {initializing
              ? <ActivityIndicator color={colors.foreground} />
              : <Text style={styles.primaryButtonText}>Wake Up Buddy 🐣</Text>
            }
          </Pressable>
        </View>
        <TabBar activeTab="home" />
      </View>
    )
  }

  if (!data) return null

  // ── Derived values ────────────────────────────────────────────────────────────

  const companionMood = moodToCompanionMood(data.mood)
  const moodBarColor = getMoodBarColor(data.mood)
  const streakProgress = Math.min(data.streak_days / 30, 1)
  const xpProgress = data.xp_progress_pct / 100
  const moodProgress = data.mood / 100

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Buddy</Text>
        <Pressable style={styles.cogButton} onPress={() => navigation.navigate('Settings')}>
          <CogIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCompanion(true); fetchRoadmap() }}
            tintColor={colors.mint}
          />
        }
      >
        {/* ── Room scene ────────────────────────────────────────────────────── */}
        <RoomScene>
          <Animated.View style={{ transform: [{ scale: companionScale }] }}>
            <Companion size={130} mood={companionMood} />
          </Animated.View>
        </RoomScene>

        {/* ── Stats rings ───────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <RadialRing
            progress={streakProgress}
            color={colors.golden}
            centerLabel={`${data.streak_days}`}
            bottomLabel={`${data.streak_days} days`}
            subLabel="Streak"
          />
          <RadialRing
            progress={xpProgress}
            color={colors.mint}
            centerLabel={`Lv.${data.level}`}
            bottomLabel={getXpLabel(data)}
            subLabel="Level"
          />
          <RadialRing
            progress={moodProgress}
            color={moodBarColor}
            centerLabel={`${data.mood}`}
            bottomLabel="Mood"
          />
        </View>

        {/* ── Missions section ──────────────────────────────────────────────── */}
        <View style={styles.missionsSection}>
          <Text style={styles.missionsHeading}>YOUR MISSIONS</Text>

          {missions.length === 0 ? (
            <View style={styles.noMissions}>
              <Text style={styles.noMissionsText}>No missions yet — start a lesson!</Text>
            </View>
          ) : (() => {
            // Group by lesson_key, preserving order of first appearance
            const lessonOrder: string[] = []
            const grouped: Record<string, IncompleteMission[]> = {}
            for (const m of missions) {
              if (!grouped[m.lesson_key]) {
                lessonOrder.push(m.lesson_key)
                grouped[m.lesson_key] = []
              }
              grouped[m.lesson_key].push(m)
            }
            return lessonOrder.map((key) => {
              const group = grouped[key]
              const lessonTitle = group[0].lesson_title
              return (
                <View key={key} style={styles.lessonGroup}>
                  <Text style={styles.lessonGroupHeader} numberOfLines={1}>{lessonTitle}</Text>
                  <View style={styles.missionsList}>
                    {group.map((mission) => (
                      <MissionCard
                        key={`${mission.lesson_key}-${mission.mission_id}`}
                        mission={mission}
                        onPress={() => navigation.navigate('LessonScreen', {
                          lessonKey: mission.lesson_key,
                          lessonTitle: mission.lesson_title,
                          chapterTitle: mission.chapter_title,
                          goal: mission.goal,
                          experience: mission.experience,
                          completedLessonTitles: [],
                          domain: mission.domain,
                          userId: user?.id ?? null,
                          lessonId: mission.lesson_key,
                          initialMissionId: mission.mission_id,
                          onComplete: () => {},
                        })}
                      />
                    ))}
                  </View>
                </View>
              )
            })
          })()}
        </View>

        {/* ── Go to Shop ────────────────────────────────────────────────────── */}
        <Pressable
          style={[styles.shopButton, shadows.mint]}
          onPress={() => navigation.navigate('CompanionShop')}
        >
          <Text style={styles.shopButtonText}>Go to Shop</Text>
        </Pressable>

        {/* ── Find Friends ──────────────────────────────────────────────────── */}
        <Pressable
          style={[styles.friendsButton]}
          onPress={() => navigation.navigate('FriendSearch')}
        >
          <Text style={styles.friendsButtonText}>Find Friends</Text>
        </Pressable>
      </ScrollView>

      <TabBar activeTab="home" />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
  },
  cogButton: {
    padding: 6,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    gap: 16,
  },

  // ── Stats row ───────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },

  // ── Missions ────────────────────────────────────────────────────────────────
  missionsSection: {
    gap: 10,
  },
  missionsHeading: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 2,
  },
  missionsList: {
    gap: 8,
  },
  lessonGroup: {
    gap: 6,
  },
  lessonGroupHeader: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.foreground,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  noMissions: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingVertical: 20,
    alignItems: 'center',
  },
  noMissionsText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
  },

  // ── Shop button ─────────────────────────────────────────────────────────────
  shopButton: {
    backgroundColor: colors.mint,
    paddingVertical: 17,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  shopButtonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.foreground,
  },
  friendsButton: {
    backgroundColor: colors.sky,
    paddingVertical: 17,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  friendsButtonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.foreground,
  },

  // ── Loading / error / not-found ─────────────────────────────────────────────
  loadingText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  notFoundTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 28,
    color: colors.foreground,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.mint,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.foreground,
  },
})
