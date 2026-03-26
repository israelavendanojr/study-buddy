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
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const placeholders = [
  'I want to speak Spanish…',
  'I want to learn chess…',
  'I want to run a 5K…',
  'I want to cook Italian food…',
]

export default function OnboardingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
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
    navigation.navigate('BuddyNaming', { goal: goal.trim() })
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
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <Text style={styles.heading}>Hi there! 👋</Text>
        <Text style={styles.subheading}>Let's learn something amazing.</Text>

        <TextInput
          style={styles.input}
          value={goal}
          onChangeText={setGoal}
          placeholder={placeholders[placeholderIdx]}
          placeholderTextColor={colors.muted + '80'}
          returnKeyType="done"
          onSubmitEditing={handlePress}
        />

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
  input: {
    width: '100%',
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    color: colors.foreground,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.background,
    marginBottom: 20,
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
})
