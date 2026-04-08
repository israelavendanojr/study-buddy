import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import { colors, radius } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

export default function LoadingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const { user, isLoaded } = useUser()
  const [error, setError] = useState<string | null>(null)

  const checkRoadmap = async () => {
    if (!user) return
    setError(null)
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
      } else if (res.status === 404) {
        // No roadmap yet — first time user
        navigation.replace('Onboarding')
      } else {
        setError('Something went wrong. Tap to retry.')
      }
    } catch {
      setError("Can't reach the server. Make sure the backend is running.")
    }
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      navigation.replace('Onboarding')
      return
    }
    checkRoadmap()
  }, [isLoaded, user])

  return (
    <View style={styles.container}>
      <Companion size={120} mood={error ? 'sad' : 'idle'} />
      {error ? (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={checkRoadmap}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.loadingText}>Getting things ready…</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.muted,
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: colors.mint,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.foreground,
  },
})
