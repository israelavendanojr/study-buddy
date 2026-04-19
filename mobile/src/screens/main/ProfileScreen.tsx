import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useAuth } from '@clerk/clerk-expo'
import { colors, radius } from '../../theme'
import TabBar from '../../components/TabBar'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

interface RoadmapData {
  roadmap_json: {
    _meta?: {
      goal?: string
    }
  }
}

export default function ProfileScreen() {
  const { user } = useUser()
  const { signOut } = useAuth()
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [lessonsCompleted, setLessonsCompleted] = useState(0)
  const [totalXp, setTotalXp] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const fetchUserData = async () => {
      try {
        // Fetch roadmap
        const roadmapRes = await fetch(`${API_BASE}/roadmap/${user.id}`)
        if (roadmapRes.ok) {
          const data = await roadmapRes.json()
          setRoadmap(data)
        }

        // Fetch user's lessons to count completed ones
        const missionsRes = await fetch(`${API_BASE}/lesson/user/${user.id}/missions`)
        if (missionsRes.ok) {
          const missions = await missionsRes.json()
          // Count unique lesson keys and assume they're all started
          // This is a simplified count - in a real app you'd track this properly
          setLessonsCompleted(Math.max(0, missions.length))
          setTotalXp(Math.max(0, missions.length) * 20)
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user?.id])

  const goal = roadmap?.roadmap_json?._meta?.goal || 'Learning to cook'

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍🍳</Text>
          </View>
          <Text style={styles.name}>{user?.fullName || user?.firstName || 'User'}</Text>
          <Text style={styles.goal}>Learning: {goal}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lessonsCompleted}</Text>
            <Text style={styles.statLabel}>Lessons Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalXp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Streak Days</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => {
              // Navigate to onboarding to change goal
              // For now, just a placeholder
            }}
          >
            <Text style={styles.primaryButtonText}>Change Goal</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => signOut()}
          >
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
        </SafeAreaView>

      <TabBar activeTab="profile" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mint + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  name: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    color: colors.foreground,
    marginBottom: 8,
  },
  goal: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: colors.ink,
  },
  statValue: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: colors.accent,
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
    paddingBottom: 32,
  },
  button: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 3.5,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderColor: colors.ink,
  },
  primaryButtonText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.ink,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: colors.ink,
  },
  secondaryButtonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.foreground,
  },
})
