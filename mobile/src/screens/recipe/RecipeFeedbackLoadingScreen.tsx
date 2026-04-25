import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing } from '../../theme'
import { validateLesson } from '../../api/client'
import { useUser } from '@clerk/clerk-expo'

const LOADING_MESSAGES = [
  'Analyzing your technique...',
  'Checking mise en place...',
  'Evaluating presentation...',
  'Calculating your score...',
]

export default function RecipeFeedbackLoadingScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { lessonKey, lessonTitle, goal, experience, photoUri, notes, lessonData } = route.params

  const barWidth = useRef(new Animated.Value(0)).current
  const msgIndex = useRef(0)
  const [message, setMessage] = React.useState(LOADING_MESSAGES[0])

  useEffect(() => {
    // Animate progress bar
    Animated.timing(barWidth, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: false,
    }).start()

    // Cycle messages
    const interval = setInterval(() => {
      msgIndex.current = (msgIndex.current + 1) % LOADING_MESSAGES.length
      setMessage(LOADING_MESSAGES[msgIndex.current])
    }, 1000)

    // Call grading API
    async function grade() {
      try {
        const result = await validateLesson({
          user_id: user?.id ?? '',
          lesson_key: lessonKey,
          photo_url: photoUri,
          notes,
        })
        clearInterval(interval)
        navigation.replace('RecipeFeedback', {
          ...route.params,
          feedback: result,
        })
      } catch (e) {
        console.error('[RecipeFeedbackLoading]', e)
        clearInterval(interval)
        // Navigate with empty feedback on error
        navigation.replace('RecipeFeedback', {
          ...route.params,
          feedback: null,
        })
      }
    }

    grade()
    return () => clearInterval(interval)
  }, [])

  const barInterpolated = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <GridBackground style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 40 }]}>
        <MonkeyMascot size={100} />

        <Text style={styles.headline}>Grading your dish...</Text>
        <Text style={styles.message}>{message}</Text>

        {/* Progress bar */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: barInterpolated }]} />
        </View>

        <Text style={styles.hint}>Powered by AI vision analysis</Text>
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  headline: {
    fontFamily: typography.headlineBold,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    fontFamily: typography.headlineItalic,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 8,
    backgroundColor: colors.paperShadow,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.amber,
    borderRadius: 4,
  },
  hint: {
    fontFamily: typography.labelMedium,
    fontSize: 11,
    color: colors.inkSoft,
    letterSpacing: 0.5,
    marginTop: -spacing.sm,
  },
})
