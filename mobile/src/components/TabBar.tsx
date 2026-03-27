import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import { colors } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

type ActiveTab = 'path' | 'home' | 'badges'

function MapIcon({ active }: { active?: boolean }) {
  const c = active ? colors.mint : colors.muted
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 4v13M15 7v13" stroke={c} strokeWidth={1.8} />
    </Svg>
  )
}

function HomeIcon({ active }: { active?: boolean }) {
  const c = active ? colors.mint : colors.muted
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 21V12h6v9" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

function BadgeIcon({ active }: { active?: boolean }) {
  const c = active ? colors.mint : colors.muted
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="9" r="6" stroke={c} strokeWidth={1.8} />
      <Path d="M8.5 14.5L7 21l5-2 5 2-1.5-6.5" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
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
    if (activeTab === 'path' || loading) return
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
          <MapIcon active={activeTab === 'path'} />
          <Text style={[styles.tabLabel, activeTab === 'path' && { color: colors.mint }]}>Path</Text>
          {activeTab === 'path' && <View style={styles.tabIndicator} />}
        </Animated.View>
      </Pressable>

      <Pressable style={styles.tab} onPress={() => activeTab !== 'home' && navigation.replace('Home')}>
        <HomeIcon active={activeTab === 'home'} />
        <Text style={[styles.tabLabel, activeTab === 'home' && { color: colors.mint }]}>Home</Text>
        {activeTab === 'home' && <View style={styles.tabIndicator} />}
      </Pressable>

      <Pressable style={styles.tab} onPress={() => activeTab !== 'badges' && navigation.replace('Badges')}>
        <BadgeIcon active={activeTab === 'badges'} />
        <Text style={[styles.tabLabel, activeTab === 'badges' && { color: colors.mint }]}>Badges</Text>
        {activeTab === 'badges' && <View style={styles.tabIndicator} />}
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
