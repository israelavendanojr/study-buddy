import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useSignUp } from '@clerk/clerk-expo'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp()
  const navigation = useNavigation<StackNavigationProp<any>>()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!isLoaded) return
    setError('')
    setLoading(true)
    try {
      await signUp.create({ emailAddress: email, password, username })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!isLoaded) return
    setError('')
    setLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        setError('Verification incomplete. Please try again.')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Companion size={80} mood="excited" />

        {!pendingVerification ? (
          <>
            <Text style={styles.heading}>Let's get started!</Text>
            <Text style={styles.subheading}>Create your account.</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.muted + '80'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.muted + '80'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.muted + '80'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, shadows.peach]}
              onPress={handleSignUp}
              disabled={loading || !email || !username || !password}
            >
              {loading ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <Text style={styles.buttonText}>Sign Up →</Text>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Check your email!</Text>
            <Text style={styles.subheading}>Enter the code we sent you.</Text>

            <TextInput
              style={styles.input}
              placeholder="Verification code"
              placeholderTextColor={colors.muted + '80'}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, shadows.mint]}
              onPress={handleVerify}
              disabled={loading || !code}
            >
              {loading ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <Text style={styles.buttonText}>Verify →</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  heading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 32,
    color: colors.foreground,
    marginTop: 16,
  },
  subheading: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  button: {
    width: '100%',
    backgroundColor: colors.peach,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
  },
  link: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  error: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: '#E05C5C',
    textAlign: 'center',
  },
})
