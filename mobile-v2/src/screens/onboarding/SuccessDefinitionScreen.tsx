import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import OnboardingLayout from './OnboardingLayout'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing } from '../../theme'

interface Props {
  navigation: NativeStackNavigationProp<any>
  route: { params: Record<string, unknown> }
}

export default function SuccessDefinitionScreen({ navigation, route }: Props) {
  const params = route.params
  const [text, setText] = useState('')

  return (
    <OnboardingLayout
      step={5}
      totalSteps={6}
      question="What does success look like for you?"
      subtitle="Describe it in your own words — a specific dish, a feeling, a moment."
      onContinue={() =>
        navigation.navigate('Commitment', { ...params, success_vision: text })
      }
      continueDisabled={text.trim().length < 5}
    >
      {/* Mascot with speech bubble */}
      <View style={styles.mascotRow}>
        <MonkeyMascot size={64} />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>
            "Be specific. 'Cook a good dinner' is less useful than 'nail a weeknight chicken dish my partner actually requests.'"
          </Text>
        </View>
      </View>

      {/* Free text input */}
      <TextInput
        style={styles.textarea}
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={5}
        placeholder="I want to be able to..."
        placeholderTextColor={colors.inkSoft}
        textAlignVertical="top"
      />
      <Text style={styles.charHint}>{text.trim().length} / 200</Text>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  bubble: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  bubbleText: {
    fontFamily: typography.headlineItalic,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  textarea: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 4,
    padding: spacing.md,
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: 130,
    lineHeight: 22,
  },
  charHint: {
    fontFamily: typography.label,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
})
