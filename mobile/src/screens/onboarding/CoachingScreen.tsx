import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import Companion from '../../components/Companion'
import { colors, radius, shadows } from '../../theme'

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

// ── Types ──────────────────────────────────────────────────────────────────────

type QuestionOption = {
  value: string
  label: string
  companionReply: string
}

type Question = {
  id: string
  question: string
  options: QuestionOption[]
}

interface CoachingParams {
  goalType: string
  experience: string
  sessionHours: number
  sessionMinutes: number
  daysPerWeek: number
  weeks: number
  gradingMode: string
}

interface SelectedAnswer {
  questionId: string
  value: string
  label: string
}

// ── Question Bank ──────────────────────────────────────────────────────────────

const QUESTION_BANK: {
  universal: Question[]
  goal_specific: Record<string, Question>
} = {
  universal: [
    {
      id: 'q1_frequency',
      question: 'How often do you cook right now?',
      options: [
        {
          value: 'never',
          label: 'Rarely — takeout life',
          companionReply: "That's okay! We'll build good habits one lesson at a time.",
        },
        {
          value: 'sometimes',
          label: 'A few times a week',
          companionReply: "Nice — you've already got a rhythm. Let's sharpen it.",
        },
        {
          value: 'often',
          label: 'Most days',
          companionReply: "You're consistent — I'll make sure we keep pushing you forward.",
        },
        {
          value: 'daily',
          label: 'Every single day',
          companionReply: "A daily cook! I'll fast-track you to the good stuff.",
        },
      ],
    },
    {
      id: 'q2_obstacle',
      question: 'What usually stops you from cooking?',
      options: [
        {
          value: 'time',
          label: 'Not enough time',
          companionReply: "Noted. I'll keep lessons tight and practical.",
        },
        {
          value: 'confidence',
          label: 'Not sure where to start',
          companionReply: "That's exactly why I'm here. We'll go step by step.",
        },
        {
          value: 'ideas',
          label: 'Running out of ideas',
          companionReply: "We'll fix that — expect some fun new directions.",
        },
        {
          value: 'nothing',
          label: 'Nothing, I just want to improve',
          companionReply: "Love that! Let's get into it.",
        },
      ],
    },
  ],
  goal_specific: {
    learn_from_scratch: {
      id: 'q3_goal_specific',
      question: "What's your biggest kitchen fear?",
      options: [
        {
          value: 'burning',
          label: 'Burning everything',
          companionReply: "Heat control is coming right up!",
        },
        {
          value: 'bland',
          label: 'Food turning out bland',
          companionReply: "Flavor fundamentals first — we'll fix that fast.",
        },
        {
          value: 'timing',
          label: 'Getting timing wrong',
          companionReply: "Mise en place will change everything for you.",
        },
        {
          value: 'knife',
          label: 'Using a knife safely',
          companionReply: "We'll get you confident with a knife in no time.",
        },
      ],
    },
    cook_better: {
      id: 'q3_goal_specific',
      question: "What's your biggest kitchen fear?",
      options: [
        {
          value: 'burning',
          label: 'Burning everything',
          companionReply: "Heat control is coming right up!",
        },
        {
          value: 'bland',
          label: 'Food turning out bland',
          companionReply: "Flavor fundamentals first — we'll fix that fast.",
        },
        {
          value: 'timing',
          label: 'Getting timing wrong',
          companionReply: "Mise en place will change everything for you.",
        },
        {
          value: 'knife',
          label: 'Using a knife safely',
          companionReply: "We'll get you confident with a knife in no time.",
        },
      ],
    },
    host_impress: {
      id: 'q3_goal_specific',
      question: "What's your biggest kitchen fear?",
      options: [
        {
          value: 'burning',
          label: 'Burning everything',
          companionReply: "Heat control is coming right up!",
        },
        {
          value: 'bland',
          label: 'Food turning out bland',
          companionReply: "Flavor fundamentals first — we'll fix that fast.",
        },
        {
          value: 'timing',
          label: 'Getting timing wrong',
          companionReply: "Mise en place will change everything for you.",
        },
        {
          value: 'knife',
          label: 'Using a knife safely',
          companionReply: "We'll get you confident with a knife in no time.",
        },
      ],
    },
    skill_focus: {
      id: 'q3_goal_specific',
      question: 'Which area calls to you most?',
      options: [
        {
          value: 'knife_skills',
          label: 'Knife skills',
          companionReply: "Precision is everything — great choice!",
        },
        {
          value: 'sauces',
          label: 'Sauces & reductions',
          companionReply: "Sauces are where good food becomes great.",
        },
        {
          value: 'heat',
          label: 'Heat & temperature',
          companionReply: "Understanding heat changes every dish you make.",
        },
        {
          value: 'flavor',
          label: 'Flavor & seasoning',
          companionReply: "Tasting and adjusting is the real chef skill.",
        },
      ],
    },
    understand_flavor: {
      id: 'q3_goal_specific',
      question: 'What confuses you most about seasoning?',
      options: [
        {
          value: 'salt',
          label: 'When and how much to salt',
          companionReply: "Salt timing is the big secret — we'll nail this.",
        },
        {
          value: 'balance',
          label: 'Balancing flavors',
          companionReply: "Sweet, sour, salty, bitter — let's map it all.",
        },
        {
          value: 'layering',
          label: 'Building flavor as you cook',
          companionReply: "Layering is where the magic happens!",
        },
        {
          value: 'tasting',
          label: 'Knowing when something tastes right',
          companionReply: "Training your palate is the best skill you'll ever develop.",
        },
      ],
    },
    cuisine_focus: {
      id: 'q3_goal_specific',
      question: 'What aspect matters most to you?',
      options: [
        {
          value: 'technique',
          label: 'Classic techniques',
          companionReply: "Technique is the foundation of every great cuisine.",
        },
        {
          value: 'flavors',
          label: 'Authentic flavors',
          companionReply: "Let's dive deep into what makes this cuisine special.",
        },
        {
          value: 'ingredients',
          label: 'Key ingredients',
          companionReply: "Ingredients are the soul of cuisine — let's explore!",
        },
        {
          value: 'dishes',
          label: 'Signature dishes',
          companionReply: "Master the classics and you'll cook with confidence.",
        },
      ],
    },
  },
}

// ── Goal label mapping ─────────────────────────────────────────────────────────

const GOAL_LABEL_MAP: Record<string, string> = {
  learn_from_scratch: 'Learn to cook from scratch',
  cook_better: 'Cook better at home',
  skill_focus: 'Master a specific cooking skill',
  host_impress: 'Cook impressive meals for others',
  understand_flavor: 'Understand flavor and seasoning',
  cuisine_focus: 'Learn a specific cuisine',
}

// ── Build coaching result from answers ──────────────────────────────────────────

const buildCoachingResult = (goalType: string, answers: SelectedAnswer[]) => {
  const q1Answer = answers.find((a) => a.questionId === 'q1_frequency')
  const q2Answer = answers.find((a) => a.questionId === 'q2_obstacle')
  const q3Answer = answers.find((a) => a.questionId === 'q3_goal_specific')

  return {
    refined_goal: GOAL_LABEL_MAP[goalType] || goalType,
    success_metric: q3Answer?.label ?? q1Answer?.label ?? '',
    motivation: q2Answer?.label ?? '',
    learning_style: 'hands-on',
    obstacles: q2Answer?.value === 'time' ? 'limited time' : q2Answer?.label ?? '',
    baseline: q1Answer?.label ?? '',
    recommended_approach: 'short focused sessions with practical missions',
    key_interests: q3Answer?.label ?? '',
  }
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function CoachingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const route = useRoute<RouteProp<{ params: CoachingParams }, 'params'>>()
  const params = route.params

  const [answers, setAnswers] = useState<SelectedAnswer[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptionValue, setSelectedOptionValue] = useState<string | null>(null)
  const [companionReply, setCompanionReply] = useState<string>('')

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  // Get current question
  const currentQuestion =
    currentQuestionIndex < 2
      ? QUESTION_BANK.universal[currentQuestionIndex]
      : QUESTION_BANK.goal_specific[params.goalType as keyof typeof QUESTION_BANK.goal_specific] ||
        QUESTION_BANK.goal_specific.learn_from_scratch

  const handleSelectOption = (option: QuestionOption) => {
    setSelectedOptionValue(option.value)
    setCompanionReply(option.companionReply)
  }

  const handleContinue = () => {
    if (!selectedOptionValue) return

    const newAnswer: SelectedAnswer = {
      questionId: currentQuestion.id,
      value: selectedOptionValue,
      label: currentQuestion.options.find((o: QuestionOption) => o.value === selectedOptionValue)?.label || '',
    }

    const updatedAnswers = [...answers, newAnswer]
    setAnswers(updatedAnswers)

    if (currentQuestionIndex >= 2) {
      // Done with all 3 questions
      const coachingResult = buildCoachingResult(params.goalType, updatedAnswers)
      navigation.navigate('GoalConfirmation', {
        ...params,
        coachingResult,
        conversationHistory: [], // Not used in static version
      })
    } else {
      // Next question
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedOptionValue(null)
      setCompanionReply('')
    }
  }

  const handleSkip = () => {
    navigation.navigate('GoalConfirmation', {
      ...params,
      coachingResult: null,
      conversationHistory: [],
    })
  }

  const onPressIn = () =>
    Animated.timing(buttonScale, { toValue: 0.96, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(buttonScale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  const companionMood = companionReply ? 'happy' : 'thinking'
  const displayedIndex = currentQuestionIndex

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Back */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: 3 }).map((_, i) => (
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
              {companionReply ? (
                <Text style={styles.speechText}>{companionReply}</Text>
              ) : (
                <Text style={styles.speechText}>{currentQuestion.question}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option: QuestionOption) => (
            <OptionCard
              key={option.value}
              option={option}
              isSelected={selectedOptionValue === option.value}
              onSelect={() => handleSelectOption(option)}
            />
          ))}
        </View>

        {/* Continue button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPress={handleContinue}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={!selectedOptionValue}
            style={[
              styles.continueBtn,
              shadows.mint,
              !selectedOptionValue && styles.continueBtnDisabled,
            ]}
          >
            <Text style={styles.continueBtnText}>Continue →</Text>
          </Pressable>
        </Animated.View>

        {/* Skip link */}
        <View style={styles.skipRow}>
          <Pressable onPress={handleSkip}>
            <Text style={styles.skipText}>Skip →</Text>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  )
}

// ── OptionCard ─────────────────────────────────────────────────────────────────

function OptionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: QuestionOption
  isSelected: boolean
  onSelect: () => void
}) {
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.timing(scale, { toValue: 0.97, duration: 75, useNativeDriver: true }).start()
  const onPressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 75, useNativeDriver: true }).start()

  return (
    <Animated.View style={[styles.optionWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onSelect}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.option, isSelected && styles.optionSelected]}
      >
        <View style={[styles.optionDot, isSelected && styles.optionDotSelected]} />
        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    marginBottom: 28,
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
  optionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  optionWrapper: {
    width: '100%',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  optionSelected: {
    backgroundColor: colors.mint,
  },
  optionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.muted,
  },
  optionDotSelected: {
    borderColor: colors.foreground,
    backgroundColor: colors.foreground,
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
  },
  optionLabelSelected: {
    color: colors.foreground,
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
