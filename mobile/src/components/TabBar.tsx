import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import { colors } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

type ActiveTab = 'roadmap' | 'profile'

function MapIcon({ active }: { active?: boolean }) {
  const c = active ? colors.mint : colors.muted
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 4v13M15 7v13" stroke={c} strokeWidth={1.8} />
    </Svg>
  )
}

function ProfileIcon({ active }: { active?: boolean }) {
  const c = active ? colors.mint : colors.muted
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth={1.8} />
      <Path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

interface TabBarProps {
  activeTab: ActiveTab
}

export default function TabBar({ activeTab }: TabBarProps) {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const fadeAnim = React.useRef(new Animated.Value(1)).current

  async function handleRoadmapPress() {
    if (activeTab === 'roadmap' || loading) return
    if (!user) return

    setLoading(true)
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start()

    try {
      const res = await fetch(`${API_BASE}/roadmap/${user.id}`)
      if (res.ok) {
        const { roadmap_id, active_index, _context, ...roadmapBody } = await res.json()
        navigation.replace('Roadmap', {
          roadmap: roadmapBody,
          roadmapId: roadmap_id,
          initialActiveIndex: active_index,
          goal: _context?.goal ?? '',
          experience: _context?.experience ?? 3,
          sessionHours: _context?.session_hours ?? 0,
          sessionMinutes: _context?.session_minutes ?? 30,
          weeks: _context?.weeks ?? 4,
          coachingResult: _context?.coaching_result ?? null,
        })
      }
    } catch (err) {
      console.error('Failed to fetch roadmap:', err)
      // Fade back in on error
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.tabBar}>
      <Pressable style={styles.tab} onPress={handleRoadmapPress} disabled={loading}>
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: 3 }}>
          <MapIcon active={activeTab === 'roadmap'} />
          <Text style={[styles.tabLabel, activeTab === 'roadmap' && { color: colors.mint }]}>Roadmap</Text>
          {activeTab === 'roadmap' && <View style={styles.tabIndicator} />}
        </Animated.View>
      </Pressable>

      <Pressable style={styles.tab} onPress={() => activeTab !== 'profile' && navigation.replace('Profile')}>
        <ProfileIcon active={activeTab === 'profile'} />
        <Text style={[styles.tabLabel, activeTab === 'profile' && { color: colors.mint }]}>Profile</Text>
        {activeTab === 'profile' && <View style={styles.tabIndicator} />}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 28,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.muted,
  },
  tabIndicator: {
    width: 20,
    height: 3,
    backgroundColor: colors.mint,
    borderRadius: 2,
    marginTop: 2,
  },
})
