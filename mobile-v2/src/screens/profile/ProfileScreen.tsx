import React, { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkCard from '../../components/ui/InkCard'
import InkButton from '../../components/ui/InkButton'
import MonkeyMascot from '../../components/MonkeyMascot'
import BottomNav from '../../components/ui/BottomNav'
import { colors, typography, spacing, radius, blockShadow } from '../../theme'
import { getProfile } from '../../api/client'

interface ProfileData {
  username: string
  goal: string
  grading_mode: string
  streak_days: number
  total_xp: number
  lessons_completed: number
  missions_submitted: number
  recipes_cooked: number
  chapter_progress: { current: number; total: number }
}

const GRADING_LABELS: Record<string, string> = {
  encouraging: 'ENCOURAGING',
  balanced: 'BALANCED',
  strict: 'STRICT',
}

function StatCard({
  value,
  label,
  accent = false,
}: {
  value: string | number
  label: string
  accent?: boolean
}) {
  return (
    <InkCard
      style={styles.statCard}
      shadow={accent ? 'amber' : 'paper'}
      backgroundColor={accent ? colors.amber : colors.surface}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </InkCard>
  )
}

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { signOut } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true)
        try {
          const data = await getProfile(user?.id ?? '')
          setProfile(data)
        } catch (e) {
          console.error('[Profile]', e)
        } finally {
          setLoading(false)
        }
      }
      load()
    }, [user?.id])
  )

  const displayName =
    user?.firstName ?? user?.username ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? 'Chef'

  const gradingMode = profile?.grading_mode ?? 'balanced'
  const streakDays = profile?.streak_days ?? 0
  const totalXp = profile?.total_xp ?? 0
  const lessonsCompleted = profile?.lessons_completed ?? 0
  const missionsSubmitted = profile?.missions_submitted ?? 0
  const recipesCooked = profile?.recipes_cooked ?? 0
  const chapterProgress = profile?.chapter_progress ?? { current: 0, total: 5 }

  const chapterFill = chapterProgress.total > 0
    ? (chapterProgress.current / chapterProgress.total) * 100
    : 0

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.topBar}>
          <Text style={styles.screenLabel}>PROFILE</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Settings')
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Identity card */}
        <InkCard shadow="ink" style={styles.identityCard}>
          <View style={styles.avatarRow}>
            <MonkeyMascot size={72} />
            <View style={styles.identityInfo}>
              <Text style={styles.username}>{displayName}</Text>
              {profile?.goal ? (
                <Text style={styles.goalText} numberOfLines={2}>{profile.goal}</Text>
              ) : null}
              <View style={styles.gradingBadge}>
                <Text style={styles.gradingText}>{GRADING_LABELS[gradingMode] ?? 'BALANCED'}</Text>
              </View>
            </View>
          </View>
        </InkCard>

        {/* Streak + XP */}
        <View style={styles.statsRow}>
          <StatCard value={`🔥 ${streakDays}`} label="DAY STREAK" accent />
          <StatCard value={totalXp.toLocaleString()} label="TOTAL XP" />
        </View>

        {/* Progress summary */}
        <View style={[styles.progressCard, blockShadow.paper]}>
          <Text style={styles.sectionLabel}>PROGRESS SUMMARY</Text>

          <View style={styles.progressGrid}>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{lessonsCompleted}</Text>
              <Text style={styles.progressItemLabel}>LESSONS</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{missionsSubmitted}</Text>
              <Text style={styles.progressItemLabel}>MISSIONS</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{recipesCooked}</Text>
              <Text style={styles.progressItemLabel}>RECIPES</Text>
            </View>
          </View>

          {/* Chapter progress bar */}
          <View style={styles.chapterRow}>
            <View style={styles.chapterLabelRow}>
              <Text style={styles.chapterLabel}>CURRICULUM PROGRESS</Text>
              <Text style={styles.chapterFraction}>
                {chapterProgress.current}/{chapterProgress.total} chapters
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${chapterFill}%` }]} />
            </View>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={() => signOut()}
          style={styles.signOutBtn}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav
        active="Profile"
        onPress={(tab) => {
          if (tab === 'Trail') navigation.navigate('Trail')
          if (tab === 'Kitchen') navigation.navigate('Kitchen')
        }}
      />
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amber,
  },
  settingsIcon: {
    fontSize: 20,
    color: colors.ink,
  },
  identityCard: {
    gap: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  username: {
    fontFamily: typography.headlineBold,
    fontSize: 22,
    color: colors.ink,
  },
  goalText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  gradingBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.amber,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
  },
  gradingText: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.amber,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 4,
  },
  statValue: {
    fontFamily: typography.headlineBold,
    fontSize: 24,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.ink,
  },
  progressCard: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  sectionLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  progressDivider: {
    width: 1.5,
    height: 32,
    backgroundColor: colors.paperShadow,
  },
  progressValue: {
    fontFamily: typography.headlineBold,
    fontSize: 22,
    color: colors.ink,
  },
  progressItemLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.inkSoft,
  },
  chapterRow: {
    gap: spacing.xs,
  },
  chapterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chapterLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.inkSoft,
  },
  chapterFraction: {
    fontFamily: typography.labelMedium,
    fontSize: 11,
    color: colors.inkSoft,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.paperShadow,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.amber,
    borderRadius: 4,
  },
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  signOutText: {
    fontFamily: typography.labelMedium,
    fontSize: 14,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
  },
})
