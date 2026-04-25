import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import GridBackground from '../../components/ui/GridBackground'
import MonkeyMascot from '../../components/MonkeyMascot'
import { generateRoadmap } from '../../api/client'
import { colors, typography, spacing } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
  route: {
    params: {
      goal: string
      experience: number
      frequency: string
      grading_mode: string
      session_minutes: number
      success_vision: string
    }
  }
}

const MESSAGES = [
  'Calibrating your technique gaps...',
  'Mapping your cooking journey...',
  'Selecting the right lessons...',
  'Building your unique roadmap...',
]

export default function RoadmapLoadingScreen({ navigation, route }: Props) {
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  const params = route.params

  const barAnim = useRef(new Animated.Value(0)).current
  const msgIndex = useRef(new Animated.Value(0)).current
  const [msgText, setMsgText] = React.useState(MESSAGES[0])

  useEffect(() => {
    // Animate progress bar
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 6000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()

    // Cycle messages
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % MESSAGES.length
      setMsgText(MESSAGES[i])
    }, 1500)

    // Actually generate roadmap
    async function generate() {
      if (!user?.id) return
      try {
        await generateRoadmap({
          user_id: user.id,
          goal: params.goal ?? 'Cook better at home',
          experience: params.experience ?? 2,
          frequency: params.frequency ?? 'sometimes',
          session_minutes: params.session_minutes ?? 10,
          weeks: 8,
          success_vision: params.success_vision ?? '',
          grading_mode: params.grading_mode ?? 'balanced',
        })
        clearInterval(interval)
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
      } catch (e) {
        console.error('[RoadmapLoading]', e)
        // Navigate anyway so user isn't stuck
        clearInterval(interval)
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
      }
    }

    generate()
    return () => clearInterval(interval)
  }, [])

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['5%', '95%'] })

  return (
    <GridBackground style={{ flex: 1 }}>
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        <MonkeyMascot size={110} style={styles.mascot} />

        <Text style={styles.headline}>Building your{'\n'}roadmap.</Text>
        <Text style={styles.message}>{msgText}</Text>

        {/* Progress bar */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: barWidth }]} />
        </View>
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  mascot: {
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: typography.headlineBold,
    fontSize: 34,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 42,
  },
  message: {
    fontFamily: typography.headlineItalic,
    fontSize: 16,
    color: colors.inkSoft,
    textAlign: 'center',
    minHeight: 24,
  },
  track: {
    width: '100%',
    height: 8,
    backgroundColor: colors.paperShadow,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.amber,
    borderRadius: 4,
  },
})
