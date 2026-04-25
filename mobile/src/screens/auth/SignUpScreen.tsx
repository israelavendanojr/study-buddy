import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSignUp } from '@clerk/clerk-expo'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
}

export default function SignUpScreen({ navigation }: Props) {
  const { signUp, setActive, isLoaded } = useSignUp()
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!isLoaded) return
    setError('')
    setLoading(true)
    try {
      const result = await signUp.create({
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || undefined,
        emailAddress: email,
        password,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      }
    } catch (e: any) {
      setError(e.errors?.[0]?.message ?? 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GridBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mascotRow}>
            <MonkeyMascot size={90} />
          </View>

          <Text style={styles.headline}>Start cooking.</Text>
          <Text style={styles.subhead}>Create your GarlicMonkey account.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>YOUR NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Alex Rivera"
                placeholderTextColor={colors.inkSoft}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={colors.inkSoft}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="8+ characters"
                placeholderTextColor={colors.inkSoft}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <InkButton
              label="Create Account →"
              onPress={handleSignUp}
              loading={loading}
              disabled={!name || !email || !password}
              style={styles.btn}
            />

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Sign in →</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  mascotRow: {
    marginBottom: spacing.xl,
  },
  headline: {
    fontFamily: typography.headlineBold,
    fontSize: 32,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  subhead: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  form: {
    width: '100%',
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.labelBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingVertical: spacing.sm,
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: 'transparent',
  },
  error: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.sm,
  },
  link: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  linkText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  linkBold: {
    fontFamily: typography.bodyBold,
    color: colors.ink,
  },
})
