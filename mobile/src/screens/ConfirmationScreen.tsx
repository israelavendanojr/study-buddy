import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

interface ConfirmationParams {
  goal: string
  buddyName: string
  experience: number
  sessionHours: number
  sessionMinutes: number
  daysPerWeek: number
  weeks: number
  successVision: string
}

export default function ConfirmationScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: ConfirmationParams }, 'params'>>()
  const params = route.params as ConfirmationParams
  const buttonScale = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  const onPressIn = () => {
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  }
  const onPressOut = () => {
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()
  }

  const handleConfirm = () => {
    Alert.alert(
      'Coming Soon',
      'Roadmap generation will be wired up next!',
      [{ text: 'OK' }]
    )
  }

  // Compute summary text
  const expLabel =
    params.experience <= 1
      ? 'total beginner'
      : params.experience <= 3
      ? 'having some experience'
      : 'being pretty confident'

  const totalMinutes = params.sessionHours * 60 + params.sessionMinutes
  const timeLabel = params.sessionHours > 0 && params.sessionMinutes > 0
    ? `${params.sessionHours}h ${params.sessionMinutes}m`
    : params.sessionHours > 0
    ? `${params.sessionHours} ${params.sessionHours === 1 ? 'hour' : 'hours'}`
    : `${params.sessionMinutes} minutes`

  const summaryText = `In ${params.weeks} weeks, you'll go from ${expLabel} to ${params.successVision || `mastering ${params.goal}`}, practicing ${params.daysPerWeek}x per week for ${timeLabel}.`

  const totalHoursPerWeek = (totalMinutes * params.daysPerWeek) / 60
  const achievabilityLabel =
    totalHoursPerWeek <= 7 ? '✅ Very Achievable' : '⚡ Ambitious but doable'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={styles.companionWrap}>
          <Companion size={80} mood="excited" />
        </View>

        <View style={[styles.summaryCard, shadows.peach]}>
          <Text style={styles.starEmoji}>⭐</Text>
          <Text style={styles.cardHeading}>Your Tuned Goal</Text>
          <Text style={styles.summaryText}>{summaryText}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{achievabilityLabel}</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <Pressable
            onPress={handleConfirm}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={[styles.confirmButton, shadows.mint]}
          >
            <Text style={styles.confirmButtonText}>
              This is my goal! Let's build my path →
            </Text>
          </Pressable>
        </Animated.View>

        <Pressable onPress={() => navigation.goBack()} style={styles.editLink}>
          <Text style={styles.editLinkText}>Retune</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  companionWrap: {
    marginBottom: 24,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFF4EC',
    borderRadius: radius.md,
    padding: 24,
    marginBottom: 24,
  },
  starEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardHeading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
    marginBottom: 12,
  },
  summaryText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mint + '33',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 17,
    color: colors.foreground,
    textAlign: 'center',
  },
  editLink: {
    paddingVertical: 8,
  },
  editLinkText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
  },
})
