import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import Companion from '../../components/Companion'
import { colors, radius, shadows } from '../../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

const MAX_QUESTIONS = 3

// ── Back icon ─────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12 15L7 10l5-5"
        stroke={colors.muted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Params ────────────────────────────────────────────────────────────────────

interface CoachingParams {
  goalType: string
  experience: string
  sessionHours: number
  sessionMinutes: number
  daysPerWeek: number
  weeks: number
  gradingMode: string
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CoachingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: CoachingParams }, 'params'>>()
  const params = route.params

  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([])
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  // Loading dots
  const dot1 = useRef(new Animated.Value(0.3)).current
  const dot2 = useRef(new Animated.Value(0.3)).current
  const dot3 = useRef(new Animated.Value(0.3)).current
  const dotLoops = useRef<Animated.CompositeAnimation[]>([])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  useEffect(() => {
    if (loading) {
      dotLoops.current.forEach((l) => l.stop())
      dotLoops.current = [dot1, dot2, dot3].map((anim, i) => {
        anim.setValue(0.3)
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ])
        )
        setTimeout(() => loop.start(), i * 200)
        return loop
      })
    } else {
      dotLoops.current.forEach((l) => l.stop())
      dot1.setValue(0.3)
      dot2.setValue(0.3)
      dot3.setValue(0.3)
    }
  }, [loading])

  // On mount: fire first coach call
  useEffect(() => {
    callCoach([])
  }, [])

  const experienceToInt = (exp: string): number => {
    if (exp === 'beginner') return 1
    if (exp === 'advanced') return 5
    return 3
  }

  const callCoach = async (history: Array<{ role: string; content: string }>) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/roadmap/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: params.goalType,
          buddy_name: 'Garlic',
          conversation_history: history,
          experience: experienceToInt(params.experience),
          session_minutes: params.sessionHours * 60 + params.sessionMinutes,
          days_per_week: params.daysPerWeek,
          weeks: params.weeks,
          success_vision: '',
        }),
      })
      if (!res.ok) throw new Error('Coach error')
      const data = await res.json()

      if (data.ready || questionIndex >= MAX_QUESTIONS - 1) {
        navigateToConfirmation(data.coaching_result ?? null, history)
        return
      }

      setCurrentQuestion(data.message)
      setLoading(false)
    } catch {
      setLoading(false)
      navigateToConfirmation(null, history)
    }
  }

  const navigateToConfirmation = (
    coachingResult: object | null,
    history: Array<{ role: string; content: string }>
  ) => {
    navigation.navigate('GoalConfirmation', {
      ...params,
      coachingResult,
      conversationHistory: history,
    })
  }

  const handleContinue = () => {
    if (!currentAnswer.trim() || loading) return
    const answer = currentAnswer.trim()
    const updatedHistory = [
      ...conversationHistory,
      { role: 'assistant', content: currentQuestion },
      { role: 'user', content: answer },
    ]
    setConversationHistory(updatedHistory)
    setCurrentAnswer('')
    setQuestionIndex((prev) => prev + 1)
    callCoach(updatedHistory)
  }

  const handleSkip = () => {
    navigateToConfirmation(null, conversationHistory)
  }

  const onPressIn = () =>
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  const companionMood = loading ? 'thinking' : 'happy'
  const displayedIndex = Math.min(questionIndex, MAX_QUESTIONS - 1)

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Back */}
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: MAX_QUESTIONS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < displayedIndex
                    ? styles.dotPast
                    : i === displayedIndex
                    ? styles.dotActive
                    : styles.dotFuture,
                ]}
              />
            ))}
          </View>

          {/* Companion + speech bubble */}
          <View style={styles.conversationRow}>
            <View style={styles.companionLeft}>
              <Companion size={60} mood={companionMood} />
            </View>
            <View style={styles.speechBubbleWrap}>
              <View style={styles.speechBubbleTail} />
              <View style={styles.speechBubble}>
                {loading ? (
                  <View style={styles.loadingDots}>
                    <Animated.View style={[styles.loadingDot, { opacity: dot1 }]} />
                    <Animated.View style={[styles.loadingDot, { opacity: dot2 }]} />
                    <Animated.View style={[styles.loadingDot, { opacity: dot3 }]} />
                  </View>
                ) : (
                  <Text style={styles.speechText}>{currentQuestion}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Answer input */}
          {!loading && (
            <>
              <TextInput
                style={styles.textInput}
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                placeholder="Type your answer..."
                placeholderTextColor={colors.muted + '99'}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  onPress={handleContinue}
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  disabled={!currentAnswer.trim()}
                  style={[
                    styles.continueBtn,
                    shadows.mint,
                    !currentAnswer.trim() && styles.continueBtnDisabled,
                  ]}
                >
                  <Text style={styles.continueBtnText}>Continue →</Text>
                </Pressable>
              </Animated.View>

              <View style={styles.skipRow}>
                <Pressable onPress={handleSkip}>
                  <Text style={styles.skipText}>Skip →</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotActive: {
    backgroundColor: colors.mint,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotPast: {
    backgroundColor: colors.mint,
    opacity: 0.5,
  },
  dotFuture: {
    backgroundColor: colors.border,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  companionLeft: {
    flexShrink: 0,
    marginTop: 4,
  },
  speechBubbleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  speechBubbleTail: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.card,
    marginTop: 16,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderTopLeftRadius: 4,
    padding: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  speechText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint,
  },
  textInput: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  continueBtn: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
  },
  skipRow: {
    alignItems: 'flex-end',
  },
  skipText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
})
