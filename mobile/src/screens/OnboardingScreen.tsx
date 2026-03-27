import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const GOAL_PREFIX = 'I want to learn'
const placeholders = [
  'to speak Spanish…',
  'chess…',
  'to run a 5K…',
  'to cook Italian food…',
  'to play guitar…',
  'how to code…',
]

export default function OnboardingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const { signOut } = useAuth()
  const [goal, setGoal] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [companionMood, setCompanionMood] = useState<'idle' | 'happy'>('happy')
  const fadeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [])

  // Wave on mount then return to idle
  useEffect(() => {
    const t = setTimeout(() => setCompanionMood('idle'), 1200)
    return () => clearTimeout(t)
  }, [])

  // Cycle placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handlePress = () => {
    if (!goal.trim()) return
    navigation.navigate('BuddyNaming', { goal: `${GOAL_PREFIX} ${goal.trim()}` })
  }

  const onPressIn = () => {
    Animated.timing(buttonScale, {
      toValue: 0.96,
      duration: 75,
      useNativeDriver: true,
    }).start()
  }

  const onPressOut = () => {
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 75,
      useNativeDriver: true,
    }).start()
  }

  const disabled = !goal.trim()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.signOutBtn} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <Text style={styles.heading}>Hi there! 👋</Text>
        <Text style={styles.subheading}>Let's learn something amazing.</Text>

        <View style={styles.inputRow}>
          <Text style={styles.prefix}>{GOAL_PREFIX}</Text>
          <TextInput
            style={styles.input}
            value={goal}
            onChangeText={setGoal}
            placeholder={placeholders[placeholderIdx]}
            placeholderTextColor={colors.muted + '80'}
            returnKeyType="done"
            onSubmitEditing={handlePress}
            autoCapitalize="none"
          />
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <Pressable
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={disabled}
            style={[
              styles.button,
              shadows.mint,
              disabled && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.buttonText}>Let's Go! →</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.companionWrap}>
          <Companion size={120} mood={companionMood} />
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 32,
    color: colors.foreground,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    color: colors.muted,
    marginBottom: 32,
  },
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
  },
  prefix: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: colors.muted,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    color: colors.foreground,
    paddingVertical: 4,
  },
  button: {
    width: '100%',
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
  },
  companionWrap: {
    marginTop: 32,
  },
  signOutBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.muted,
  },
})
