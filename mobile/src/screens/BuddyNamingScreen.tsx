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
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

export default function BuddyNamingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: { goal: string } }, 'params'>>()
  const { goal } = route.params as { goal: string }

  const [buddyName, setBuddyName] = useState('')
  const slideAnim = useRef(new Animated.Value(60)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handlePress = () => {
    if (!buddyName.trim()) return
    navigation.navigate('GoalTuning', { goal, buddyName: buddyName.trim() })
  }

  const onPressIn = () => {
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  }
  const onPressOut = () => {
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()
  }

  const disabled = !buddyName.trim()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View
        style={[
          styles.inner,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.heading}>Your buddy needs a name!</Text>
        <Text style={styles.subheading}>Give your new companion a special name.</Text>

        <View style={styles.companionWrap}>
          <Companion size={140} mood="excited" />
        </View>

        <TextInput
          style={styles.input}
          value={buddyName}
          onChangeText={setBuddyName}
          placeholder="Name your buddy…"
          placeholderTextColor={colors.muted + '80'}
          returnKeyType="done"
          onSubmitEditing={handlePress}
          textAlign="center"
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <Pressable
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={disabled}
            style={[
              styles.button,
              shadows.peach,
              disabled && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.buttonText}>Nice to meet you! 🤝</Text>
          </Pressable>
        </Animated.View>

        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Change my goal</Text>
        </Pressable>
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
    fontSize: 28,
    color: colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    color: colors.muted,
    marginBottom: 24,
    textAlign: 'center',
  },
  companionWrap: {
    marginBottom: 24,
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
    backgroundColor: colors.peach,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
  },
  backLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
  },
})
