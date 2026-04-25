import React, { useCallback, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkCard from '../../components/ui/InkCard'
import MonkeyMascot from '../../components/MonkeyMascot'
import BottomNav from '../../components/ui/BottomNav'
import { colors, typography, spacing, radius, blockShadow } from '../../theme'
import { listMissions } from '../../api/client'

interface Mission {
  id: number
  lesson_title: string
  title: string
  description: string
  status: string
  created_at: string
}

function MissionCard({ mission, onPress }: { mission: Mission; onPress: () => void }) {
  const isSubmitted = mission.status === 'submitted' || mission.status === 'graded'
  const date = new Date(mission.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.card, isSubmitted && styles.cardSubmitted, blockShadow.paper]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardLesson}>{mission.lesson_title?.toUpperCase() ?? 'LESSON'}</Text>
            <Text style={styles.cardDate}>{date}</Text>
          </View>
          <View style={[styles.statusBadge, isSubmitted && styles.statusBadgeDone]}>
            <Text style={[styles.statusText, isSubmitted && styles.statusTextDone]}>
              {isSubmitted ? 'SUBMITTED' : 'ACTIVE'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{mission.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{mission.description}</Text>
        {!isSubmitted && (
          <Text style={styles.cardCTA}>Tap to submit →</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function KitchenScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadMissions(silent = false) {
    if (!silent) setLoading(true)
    try {
      const data = await listMissions(user?.id ?? '')
      setMissions(data ?? [])
    } catch (e) {
      console.error('[Kitchen]', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadMissions()
    }, [user?.id])
  )

  const activeMissions = missions.filter((m) => m.status === 'unlocked')
  const completedMissions = missions.filter((m) => m.status !== 'unlocked')

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadMissions(true) }}
            tintColor={colors.amber}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenLabel}>KITCHEN</Text>
          <Text style={styles.title}>Your Missions</Text>
          <Text style={styles.subtitle}>Practice techniques from your lessons.</Text>
        </View>

        {/* Active missions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACTIVE MISSIONS</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : activeMissions.length === 0 ? (
            <View style={styles.emptyState}>
              <MonkeyMascot size={72} />
              <Text style={styles.emptyTitle}>No active missions yet.</Text>
              <Text style={styles.emptyText}>
                Complete a lesson on the Trail to unlock your first kitchen challenge.
              </Text>
            </View>
          ) : (
            activeMissions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                onPress={() => navigation.navigate('MissionDetail', { mission: m })}
              />
            ))
          )}
        </View>

        {/* Completed missions */}
        {completedMissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>COMPLETED</Text>
            {completedMissions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                onPress={() => navigation.navigate('MissionDetail', { mission: m })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav
        active="Kitchen"
        onPress={(tab) => {
          if (tab === 'Trail') navigation.navigate('Trail')
          if (tab === 'Profile') navigation.navigate('Profile')
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
  header: {
    gap: spacing.xs,
  },
  screenLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amber,
  },
  title: {
    fontFamily: typography.headlineBold,
    fontSize: 28,
    color: colors.ink,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  card: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  cardSubmitted: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardMeta: {
    gap: 2,
    flex: 1,
  },
  cardLesson: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.inkSoft,
  },
  cardDate: {
    fontFamily: typography.labelMedium,
    fontSize: 11,
    color: colors.inkSoft,
  },
  statusBadge: {
    borderWidth: 1.5,
    borderColor: colors.amber,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
  },
  statusBadgeDone: {
    borderColor: colors.paperShadow,
  },
  statusText: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.amber,
  },
  statusTextDone: {
    color: colors.inkSoft,
  },
  cardTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
  },
  cardDesc: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  cardCTA: {
    fontFamily: typography.labelMedium,
    fontSize: 12,
    color: colors.amber,
    marginTop: spacing.xs,
  },
  loadingRow: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
})
