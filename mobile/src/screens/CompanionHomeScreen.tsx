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
import { useIsFocused, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import TabBar from '../components/TabBar'
import { colors, radius, shadows } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

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

// ── Pure helpers ───────────────────────────────────────────────────────────────

function moodToCompanionMood(mood: number): CompanionMood {
  if (mood <= 40) return 'sad'
  if (mood <= 70) return 'idle'
  return 'happy'
}

function getMoodEmoji(mood: number): string {
  if (mood <= 20) return '😢'
  if (mood <= 40) return '😐'
  if (mood <= 60) return '🙂'
  if (mood <= 85) return '😊'
  return '😄'
}

function getMoodBarColor(mood: number): string {
  if (mood <= 20) return '#FF6B6B'
  if (mood <= 40) return '#FFB347'
  if (mood <= 60) return '#FFD166'
  if (mood <= 85) return colors.mint
  return '#5CCB8F'
}

function formatLastPractice(dateStr: string | null): string {
  if (!dateStr) return 'No practice yet — start a lesson!'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (diffHours < 1) return 'Just now'
  if (diffDays < 1) return `Today at ${timeStr}`
  if (diffDays === 1) return `Yesterday at ${timeStr}`
  return `${diffDays} days ago`
}

function getStreakLabel(streak: number, lastPractice: string | null): string {
  if (streak === 0) {
    if (!lastPractice) return 'Start your first lesson!'
    return 'Streak broken — get back on track!'
  }
  return streak === 1 ? '1-Day Streak' : `${streak}-Day Streak`
}

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

  // XP bar: driven by pixel width, resolved after container lays out
  const xpBarAnim = useRef(new Animated.Value(0)).current
  const xpBarContainerWidth = useRef(0)
  const prevXpPct = useRef(-1)

  // Companion bounce when mood changes between fetches
  const companionScale = useRef(new Animated.Value(1)).current
  const prevMood = useRef<number | null>(null)

  // Skip focus-refetch on the very first render (initial fetch handles it)
  const isMounted = useRef(false)

  // ── Fetch ────────────────────────────────────────────────────────────────────

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

  // Initial load
  useEffect(() => {
    fetchCompanion()
    isMounted.current = true
  }, [fetchCompanion])

  // Refetch silently when screen regains focus (e.g. returning from LessonScreen)
  useEffect(() => {
    if (!isMounted.current) return
    if (isFocused) fetchCompanion(true)
  }, [isFocused])

  // ── XP bar animation ──────────────────────────────────────────────────────────

  function animateXpBar(pct: number, containerWidth: number, animate: boolean) {
    const targetWidth = (pct / 100) * containerWidth
    if (animate) {
      Animated.timing(xpBarAnim, {
        toValue: targetWidth,
        duration: 600,
        useNativeDriver: false, // width cannot use native driver
      }).start()
    } else {
      xpBarAnim.setValue(targetWidth)
    }
  }

  // Fires when xp or level changes (level change resets pct to 0 → fills again)
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
      // 400 = already initialized — refetch either way
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

  // ── Not-found state (no companion yet) ────────────────────────────────────────

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
  const moodEmoji = getMoodEmoji(data.mood)
  const moodBarColor = getMoodBarColor(data.mood)
  const streakLabel = getStreakLabel(data.streak_days, data.last_practice_date)
  const lastPracticeText = formatLastPractice(data.last_practice_date)
  const streakIsActive = data.streak_days >= 3

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCompanion(true) }}
            tintColor={colors.mint}
          />
        }
      >
        {/* ── Companion visual ─────────────────────────────────────────────── */}
        <View style={styles.companionSection}>
          <Animated.View style={{ transform: [{ scale: companionScale }] }}>
            <Companion size={140} mood={companionMood} />
          </Animated.View>
        </View>

        {/* ── Level + XP bar ───────────────────────────────────────────────── */}
        <View style={[styles.card, shadows.mint]}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Level</Text>
            <Text style={styles.levelNumber}>{data.level}</Text>
            {data.next_milestone > data.level && (
              <Text style={styles.nextMilestone}>Next milestone: lvl {data.next_milestone}</Text>
            )}
          </View>

          <View
            style={styles.xpBarTrack}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width
              if (w > 0 && w !== xpBarContainerWidth.current) {
                xpBarContainerWidth.current = w
                // Snap bar to current value on first layout (no intro animation)
                animateXpBar(data.xp_progress_pct, w, false)
                prevXpPct.current = data.xp_progress_pct
              }
            }}
          >
            <Animated.View style={[styles.xpBarFill, { width: xpBarAnim }]} />
          </View>

          <Text style={styles.xpNumbers}>
            {data.xp} / {data.xp_to_next_level} XP
          </Text>
        </View>

        {/* ── Mood gauge ───────────────────────────────────────────────────── */}
        <View style={[styles.card, { shadowColor: moodBarColor, shadowOpacity: 0.22, shadowRadius: 12, elevation: 4 }]}>
          <View style={styles.moodHeader}>
            <Text style={styles.cardLabel}>Mood</Text>
            <Text style={styles.moodEmoji}>{moodEmoji}</Text>
            <Text style={styles.moodValue}>{data.mood}/100</Text>
          </View>

          <View style={styles.moodBarTrack}>
            {/* Percentage width: RN accepts string dimensions, cast needed for TS */}
            <View
              style={[
                styles.moodBarFill,
                { width: `${data.mood}%` as unknown as number, backgroundColor: moodBarColor },
              ]}
            />
          </View>
        </View>

        {/* ── Streak ───────────────────────────────────────────────────────── */}
        <View style={[styles.card, streakIsActive ? shadows.golden : {}]}>
          <View style={styles.streakRow}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text
              style={[
                styles.streakLabel,
                { color: streakIsActive ? '#E6A817' : colors.muted },
              ]}
            >
              {streakLabel}
            </Text>
          </View>
          <Text style={styles.lastPracticed}>Last practiced: {lastPracticeText}</Text>
        </View>

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.mint }, shadows.mint]}
            onPress={() => navigation.navigate('CompanionShop')}
          >
            <Text style={styles.actionButtonText}>🛍 Go to Shop</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.golden }, shadows.golden]}
            onPress={() => {
              // TODO: navigation.navigate('CompanionRewards')
            }}
          >
            <Text style={styles.actionButtonText}>🏆 Rewards</Text>
          </Pressable>
        </View>
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
  scrollContent: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 14,
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

  // ── Companion section ───────────────────────────────────────────────────────
  companionSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  // ── Shared card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    gap: 10,
  },
  cardLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // ── Level + XP ──────────────────────────────────────────────────────────────
  levelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  levelLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
  },
  levelNumber: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 40,
    color: colors.foreground,
    lineHeight: 44,
  },
  nextMilestone: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginLeft: 'auto',
  },
  xpBarTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.mint,
    borderRadius: 5,
  },
  xpNumbers: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'right',
  },

  // ── Mood ────────────────────────────────────────────────────────────────────
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.foreground,
    marginLeft: 'auto',
  },
  moodBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // ── Streak ──────────────────────────────────────────────────────────────────
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakFlame: {
    fontSize: 28,
  },
  streakLabel: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
  },
  lastPracticed: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
  },

  // ── Action buttons ───────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.foreground,
  },
})
