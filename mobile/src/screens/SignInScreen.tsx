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
import { useSignIn } from '@clerk/clerk-expo'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const navigation = useNavigation<StackNavigationProp<any>>()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingSecondFactor, setPendingSecondFactor] = useState(false)

  const handleSignIn = async () => {
    if (!isLoaded) return
    setError('')
    setLoading(true)
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else if (result.status === 'needs_second_factor') {
        try {
          console.log('Preparing 2FA email verification...')
          const emailFactor = result.supportedSecondFactors?.find((f: any) => f.strategy === 'email_code')
          if (emailFactor) {
            await signIn.prepareSecondFactor({ strategy: 'email_code', emailAddressId: emailFactor.emailAddressId })
            console.log('2FA email prep succeeded, showing code input')
            setPendingSecondFactor(true)
          } else {
            setError('Email verification not available')
          }
        } catch (prepareErr: any) {
          console.log('Prepare 2FA error:', JSON.stringify(prepareErr))
          setError('Failed to send verification email: ' + (prepareErr.errors?.[0]?.message ?? prepareErr.message ?? 'Unknown error'))
        }
      } else {
        setError('Sign in incomplete. Please try again.')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleSecondFactorVerify = async () => {
    if (!isLoaded) return
    setError('')
    setLoading(true)
    try {
      console.log('Attempting 2FA with code:', code)
      const result = await signIn.attemptSecondFactor({ strategy: 'email_code', code })
      console.log('2FA result:', JSON.stringify({ status: result.status }))
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        setError(`Verification failed (${result.status}). Please try again.`)
      }
    } catch (err: any) {
      console.log('2FA error:', JSON.stringify(err))
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
        <Companion size={80} mood="happy" />

        {!pendingSecondFactor ? (
          <>
            <Text style={styles.heading}>Welcome back!</Text>
            <Text style={styles.subheading}>Sign in to continue learning.</Text>

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
              placeholder="Password"
              placeholderTextColor={colors.muted + '80'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, shadows.mint]}
              onPress={handleSignIn}
              disabled={loading || !email || !password}
            >
              {loading ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <Text style={styles.buttonText}>Sign In →</Text>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.link}>No account? Sign up</Text>
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
              onPress={handleSecondFactorVerify}
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
    backgroundColor: colors.mint,
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
