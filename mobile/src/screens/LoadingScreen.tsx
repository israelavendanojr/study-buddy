import React, { useEffect } from 'react'
import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import { colors } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

export default function LoadingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      navigation.replace('Onboarding')
      return
    }

    const checkRoadmap = async () => {
      try {
        const res = await fetch(`${API_BASE}/roadmap/${user.id}`)
        if (res.ok) {
          const { roadmap_id, active_index, ...roadmapBody } = await res.json()
          navigation.replace('Roadmap', {
            roadmap: roadmapBody,
            roadmapId: roadmap_id,
            initialActiveIndex: active_index,
          })
        } else {
          navigation.replace('Onboarding')
        }
      } catch {
        // Network error — fall through to onboarding
        navigation.replace('Onboarding')
      }
    }

    checkRoadmap()
  }, [isLoaded, user])

  return <View style={{ flex: 1, backgroundColor: colors.background }} />
}
