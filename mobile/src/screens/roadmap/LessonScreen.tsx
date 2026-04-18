import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  Animated,
  PanResponder,
  TextInput,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import * as ImagePicker from 'expo-image-picker'
import { File } from 'expo-file-system'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../../components/Companion'
import AnnotatedText from '../../components/AnnotatedText'
import { colors, radius, shadows } from '../../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question_text: string
  options: string[]
  correct_index: number
  explanation: string
}

interface MatchingPair {
  left: string
  right: string
}

interface Mission {
  id: string
  mission_type: 'photo_submission' | 'reflection_journal' | 'pop_quiz' | 'minigame_matching' | 'minigame_image_id' | 'minigame_fill_blank' | 'minigame_sequencing'
  title: string
  description: string
  why_it_matters: string
  is_required: boolean
  duration_minutes: number
  // photo_submission
  prompt?: string
  reflection_choices?: string[]
  // reflection_journal
  min_words?: number
  // pop_quiz
  questions?: QuizQuestion[]
  // minigame_matching
  pairs?: MatchingPair[]
  // minigame_image_id
  images?: string[] // 4 text descriptions
  correct_image_index?: number
  // minigame_sequencing
  steps?: string[] // scrambled order
  correct_order?: number[]
  // minigame_fill_blank
  fill_blank_sentence?: string
  fill_blank_answer?: string
}

interface LessonParams {
  lessonKey: string
  lessonTitle: string
  chapterTitle: string
  goal: string
  experience: number
  completedLessonTitles: string[]
  domain: string
  userId: string | null
  lessonId: string
  onComplete: (lessonId: string) => void
  onFullyComplete?: (lessonKey: string) => void
  initialMissionId?: string
}

interface AnnotatedPoint {
  text: string
  source_ids: string[]
  quote?: string
  quote_author?: string
  quote_book?: string
  quote_page?: number
}

interface SourceCited {
  source_id: string
  title?: string
  author?: string
  page_start?: number
}

interface ImageItem {
  url: string
  caption?: string
}

interface QuizCheckpointData {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

interface ReflectionCheckpointData {
  prompt: string
  min_words?: number
}

interface LessonContent {
  lesson_type?: 'technique' | 'recipe' | 'concept' | 'food_science' | 'minigame'
  lesson_key?: string
  card1: { motivation: string; learn_points: (string | AnnotatedPoint)[]; images?: ImageItem[] | null }
  card3: { headline: string; points: (string | AnnotatedPoint)[]; tell_me_more: string; images?: ImageItem[] | null; quiz_checkpoint?: QuizCheckpointData | null; reflection_prompt?: ReflectionCheckpointData | null }
  missions: Mission[]
  sources_cited?: SourceCited[]
  last_reflection_feedback?: string | null
}

interface MissionProgress {
  completed_missions: string[]
  is_required_complete: boolean
  is_fully_complete: boolean
}

interface ScoreCriterion {
  label: string
  stars: number
}

interface ValidationResult {
  is_relevant?: boolean
  criteria?: ScoreCriterion[]
  note?: string
  rejection_message?: string
  feedback?: string
  is_valid: boolean
  xp_earned: number
  mission_completed: boolean
  lesson_now_required_complete: boolean
  lesson_now_fully_complete: boolean
  companion?: Record<string, unknown>
}

interface QuizAnswerResult {
  question_index: number
  selected: number
  correct_index: number
  is_correct: boolean
  explanation: string
}

interface QuizResult {
  results: QuizAnswerResult[]
  score: number
  total: number
  passed: boolean
  mission_completed: boolean
  lesson_now_required_complete: boolean
  lesson_now_fully_complete: boolean
  xp_earned: number
  companion?: Record<string, unknown>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toAnnotatedPoint(p: string | AnnotatedPoint): AnnotatedPoint {
  return typeof p === 'string' ? { text: p, source_ids: [] } : p
}

// ── Progress Indicator ─────────────────────────────────────────────────────────

function ProgressIndicator({ current, progressAnim, totalCards }: { current: number; progressAnim: Animated.Value; totalCards: number }) {
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  return (
    <View style={piStyles.wrapper}>
      <View style={piStyles.dotsRow}>
        {Array.from({ length: totalCards }).map((_, i) => (
          <View
            key={i}
            style={[
              piStyles.dot,
              i < current && piStyles.dotDone,
              i === current && piStyles.dotActive,
            ]}
          />
        ))}
      </View>
      <View style={piStyles.barBg}>
        <Animated.View style={[piStyles.barFill, { width: barWidth }]} />
      </View>
    </View>
  )
}

const piStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  dotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotDone: { backgroundColor: colors.mint, opacity: 0.4 },
  dotActive: { backgroundColor: colors.mint, opacity: 1 },
  barBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: colors.mint, borderRadius: 2 },
})

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function LessonScreen() {
  const route = useRoute<RouteProp<{ params: LessonParams }, 'params'>>()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const params = route.params as LessonParams
  const { user } = useUser()

  // ── State ──────────────────────────────────────────────────────────────────
  const [cardIndex, setCardIndex] = useState(0)
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null)
  const [sourceMap, setSourceMap] = useState<Record<string, SourceCited>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missionProgress, setMissionProgress] = useState<MissionProgress | null>(null)
  const [progressFetched, setProgressFetched] = useState(false)
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null)

  // Photo submission state
  const [selectedReflection, setSelectedReflection] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/jpeg')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reflection journal state
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionSubmitting, setReflectionSubmitting] = useState(false)

  // Pop quiz state
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<number | null>(null)
  const [quizAnswerRevealed, setQuizAnswerRevealed] = useState(false)
  const [quizAllAnswers, setQuizAllAnswers] = useState<number[]>([])
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [quizSubmitting, setQuizSubmitting] = useState(false)

  // Card3 inline quiz checkpoint state (local only — no DB/XP)
  const [card3CheckAnswer, setCard3CheckAnswer] = useState<number | null>(null)
  const [card3CheckRevealed, setCard3CheckRevealed] = useState(false)

  // Card3 inline reflection checkpoint state
  const [card3ReflectText, setCard3ReflectText] = useState('')
  const [card3ReflectSubmitting, setCard3ReflectSubmitting] = useState(false)
  const [card3ReflectFeedback, setCard3ReflectFeedback] = useState<string | null>(null)

  // Minigame state
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([]) // tracked pairs
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [stepOrder, setStepOrder] = useState<string[]>([]) // current order
  const [fillBlankAnswer, setFillBlankAnswer] = useState('')
  const [minigameResult, setMinigameResult] = useState<{ passed: boolean; feedback: string } | null>(null)
  const [minigameSubmitting, setMinigameSubmitting] = useState(false)

  // Shared
  const [tellMeMoreOpen, setTellMeMoreOpen] = useState(false)
  const [shareCaption, setShareCaption] = useState('')
  const [sharePosting, setSharePosting] = useState(false)
  const [sharePosted, setSharePosted] = useState(false)
  const [reflectionNote, setReflectionNote] = useState('')
  const hasSignaledComplete = useRef(false)
  const hasInitializedCard = useRef(false)

  // ── Dynamic card indices ────────────────────────────────────────────────────
  const hasInteractiveCard = !!(lessonContent?.card3.quiz_checkpoint || lessonContent?.card3.reflection_prompt)
  const TOTAL_CARDS = hasInteractiveCard ? 6 : 5
  const CARD_HOOK = 0
  const CARD_DEEP_DIVE = 1
  const CARD_INTERACTIVE = hasInteractiveCard ? 2 : null
  const CARD_MISSIONS = hasInteractiveCard ? 3 : 2
  const CARD_SUBMISSION = hasInteractiveCard ? 4 : 3
  const CARD_FEEDBACK = hasInteractiveCard ? 5 : 4

  // ── Swipe nav ──────────────────────────────────────────────────────────────
  const canSwipeRef = useRef({ forward: false, back: false, index: 0 })
  const canSwipeForward = cardIndex < 2 && (cardIndex > 0 || (!loading && !!lessonContent))
  const canSwipeBack = cardIndex >= 1 && cardIndex <= (TOTAL_CARDS - 1)
  canSwipeRef.current = { forward: canSwipeForward, back: canSwipeBack, index: cardIndex }

  // ── Animations ─────────────────────────────────────────────────────────────
  const cardOpacity = useRef(new Animated.Value(1)).current
  const cardTranslateX = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const chevronRotate = useRef(new Animated.Value(0)).current
  const expandAnim = useRef(new Animated.Value(0)).current
  const xpScale = useRef(new Animated.Value(0)).current
  const feedbackOpacity = useRef(new Animated.Value(0)).current
  const companionScale = useRef(new Animated.Value(1)).current
  const dot1 = useRef(new Animated.Value(0.3)).current
  const dot2 = useRef(new Animated.Value(0.3)).current
  const dot3 = useRef(new Animated.Value(0.3)).current
  const dotLoops = useRef<Animated.CompositeAnimation[]>([])

  // ── Swipe responder ────────────────────────────────────────────────────────
  const snapBack = () =>
    Animated.spring(cardTranslateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start()

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        const { forward, back } = canSwipeRef.current
        const allowed = dx < 0 ? forward : back
        if (allowed) cardTranslateX.setValue(dx * 0.35)
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const { forward, back, index } = canSwipeRef.current
        const swipedLeft  = dx < -60 || vx < -0.4
        const swipedRight = dx >  60 || vx >  0.4
        if (swipedLeft && forward) {
          advanceCardRef.current(index + 1)
        } else if (swipedRight && back) {
          if (index === 4) { resetSubmissionRef.current(); advanceCardRef.current(2) }
          else if (index === 3) advanceCardRef.current(2)
          else advanceCardRef.current(index - 1)
        } else {
          snapBack()
        }
      },
      onPanResponderTerminate: () => snapBack(),
    })
  ).current

  const advanceCardRef = useRef<(n: number) => void>(() => {})
  const resetSubmissionRef = useRef<() => void>(() => {})

  // ── Fetch lesson ───────────────────────────────────────────────────────────
  const fetchLesson = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/lesson/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: params.userId,
          lesson_key: params.lessonKey,
          lesson_title: params.lessonTitle,
          chapter_title: params.chapterTitle,
          goal: params.goal,
          buddy_name: 'Garlic',
          experience: params.experience,
          completed_lesson_titles: params.completedLessonTitles,
          domain: params.domain,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data: LessonContent = await res.json()
      setLessonContent(data)
      // Build sourceMap from sources_cited for O(1) lookup in AnnotatedText
      if (data.sources_cited?.length) {
        const map: Record<string, SourceCited> = {}
        for (const s of data.sources_cited) {
          map[s.source_id] = s
        }
        setSourceMap(map)
      }
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch progress ─────────────────────────────────────────────────────────
  const fetchProgress = async (canonicalKey?: string) => {
    if (!params.userId) {
      setProgressFetched(true)
      return
    }
    const lessonKey = canonicalKey ?? params.lessonKey
    try {
      const res = await fetch(`${API_BASE}/lesson/${lessonKey}/${params.userId}/progress`)
      if (res.ok) {
        const data = await res.json()
        setMissionProgress({
          completed_missions: data.completed_missions,
          is_required_complete: data.is_required_complete,
          is_fully_complete: data.is_fully_complete,
        })
      }
    } catch { /* no progress yet is fine */ } finally {
      setProgressFetched(true)
    }
  }

  useEffect(() => {
    const init = async () => {
      const lessonData = await fetchLesson()
      await fetchProgress(lessonData?.lesson_key)
    }
    init()
  }, [])

  // ── Skip to missions list on revisit ────────────────────────────────────────
  useEffect(() => {
    const ready = params.userId ? progressFetched && !!lessonContent : !!lessonContent
    if (!ready || hasInitializedCard.current) return
    hasInitializedCard.current = true

    if (params.initialMissionId) {
      setCurrentMissionId(params.initialMissionId)
      setCardIndex(3)
      progressAnim.setValue(3 / TOTAL_CARDS)
    } else if (missionProgress && missionProgress.completed_missions.length > 0) {
      setCardIndex(2)
      progressAnim.setValue(2 / TOTAL_CARDS)
    }
  }, [lessonContent, progressFetched, missionProgress])

  // ── Reset quiz/reflection state when mission changes ────────────────────────
  useEffect(() => {
    setQuizQuestionIndex(0)
    setQuizSelectedAnswer(null)
    setQuizAnswerRevealed(false)
    setQuizAllAnswers([])
    setQuizResult(null)
    setReflectionText('')
    setReflectionSubmitting(false)
  }, [currentMissionId])

  // ── Reset card3 inline checkpoints when lesson loads ────────────────────────
  useEffect(() => {
    setCard3CheckAnswer(null)
    setCard3CheckRevealed(false)
    setCard3ReflectText('')
    setCard3ReflectSubmitting(false)
    setCard3ReflectFeedback(null)
  }, [lessonContent])

  // ── Card transition ─────────────────────────────────────────────────────────
  const advanceCard = (nextIndex: number) => {
    const fromIndex = canSwipeRef.current.index
    Animated.timing(cardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCardIndex(nextIndex)
      Animated.timing(progressAnim, {
        toValue: nextIndex / TOTAL_CARDS,
        duration: 300,
        useNativeDriver: false,
      }).start()
      cardTranslateX.setValue(nextIndex > fromIndex ? 20 : -20)
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(cardTranslateX, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start()
    })
  }
  advanceCardRef.current = advanceCard

  // ── Tell me more ────────────────────────────────────────────────────────────
  const toggleTellMeMore = () => {
    const next = !tellMeMoreOpen
    setTellMeMoreOpen(next)
    Animated.parallel([
      Animated.timing(expandAnim, { toValue: next ? 1 : 0, duration: 250, useNativeDriver: false }),
      Animated.timing(chevronRotate, { toValue: next ? 1 : 0, duration: 250, useNativeDriver: true }),
    ]).start()
  }

  // ── Loading dots ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (validating || reflectionSubmitting) {
      dotLoops.current.forEach(l => l.stop())
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
      dotLoops.current.forEach(l => l.stop())
      dot1.setValue(0.3); dot2.setValue(0.3); dot3.setValue(0.3)
    }
  }, [validating, reflectionSubmitting])

  // ── Card 5 reveal animations ────────────────────────────────────────────────
  useEffect(() => {
    if (!validationResult) return
    Animated.sequence([
      Animated.timing(companionScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(companionScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start()
    feedbackOpacity.setValue(0)
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start()
    xpScale.setValue(0)
    Animated.spring(xpScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }).start()
  }, [validationResult])

  // ── Photo picker ────────────────────────────────────────────────────────────
  const pickPhoto = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      })
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri)
        setPhotoMimeType(result.assets[0].mimeType ?? 'image/jpeg')
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery access is required to pick a photo.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      })
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri)
        setPhotoMimeType(result.assets[0].mimeType ?? 'image/jpeg')
      }
    }
  }

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose how to add your photo', [
      { text: 'Take a Photo', onPress: () => pickPhoto('camera') },
      { text: 'Choose from Gallery', onPress: () => pickPhoto('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  // ── Submit photo mission ────────────────────────────────────────────────────
  const handlePhotoSubmit = async () => {
    if (!photoUri || !lessonContent || !currentMissionId) return
    const mission = lessonContent.missions.find(m => m.id === currentMissionId)
    if (!mission) return

    setValidating(true)

    try {
      const base64 = await new File(photoUri).base64()

      const res = await fetch(`${API_BASE}/lesson/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: params.userId,
          lesson_key: lessonContent.lesson_key ?? params.lessonKey,
          mission_id: currentMissionId,
          photo_base64: base64,
          photo_media_type: photoMimeType,
          reflection_choice: reflectionNote || '',
          buddy_name: 'Garlic',
          goal: params.goal,
          lesson_title: params.lessonTitle,
          domain: params.domain,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data: ValidationResult = await res.json()
      setValidationResult(data)
      advanceCard(CARD_FEEDBACK)

      if (data.mission_completed) {
        setMissionProgress(prev => ({
          completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
          is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
          is_fully_complete: prev?.is_fully_complete ?? false,
        }))
      }

      if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
        hasSignaledComplete.current = true
        params.onComplete(params.lessonId)
      }

      if (data.lesson_now_fully_complete) {
        params.onFullyComplete?.(params.lessonKey)
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setValidating(false)
    }
  }

  // ── Submit reflection journal ───────────────────────────────────────────────
  const handleReflectionSubmit = async () => {
    if (!reflectionText.trim() || !lessonContent || !currentMissionId || !params.userId) return
    const mission = lessonContent.missions.find(m => m.id === currentMissionId)
    if (!mission) return

    setReflectionSubmitting(true)
    advanceCard(4)

    try {
      const res = await fetch(`${API_BASE}/lesson/reflect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: params.userId,
          lesson_key: lessonContent.lesson_key ?? params.lessonKey,
          mission_id: currentMissionId,
          reflection_text: reflectionText.trim(),
          buddy_name: 'Garlic',
          lesson_title: params.lessonTitle,
          goal: params.goal,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data: ValidationResult = await res.json()
      setValidationResult(data)

      if (data.mission_completed) {
        setMissionProgress(prev => ({
          completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
          is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
          is_fully_complete: prev?.is_fully_complete ?? false,
        }))
      }

      if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
        hasSignaledComplete.current = true
        params.onComplete(params.lessonId)
      }

      if (data.lesson_now_fully_complete) {
        params.onFullyComplete?.(params.lessonKey)
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setReflectionSubmitting(false)
    }
  }

  // ── Card3 inline reflection checkpoint ──────────────────────────────────────
  const handleCard3ReflectSubmit = async () => {
    const checkpoint = lessonContent?.card3.reflection_prompt
    if (!card3ReflectText.trim() || !checkpoint) return
    setCard3ReflectSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/lesson/reflect-inline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_title: params.lessonTitle,
          prompt: checkpoint.prompt,
          reflection_text: card3ReflectText.trim(),
          goal: params.goal,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setCard3ReflectFeedback(data.feedback)
    } catch { /* silently fail — don't block lesson */ } finally {
      setCard3ReflectSubmitting(false)
    }
  }

  // ── Quiz answer selection ───────────────────────────────────────────────────
  const handleQuizAnswer = (answerIndex: number) => {
    if (quizAnswerRevealed) return
    setQuizSelectedAnswer(answerIndex)
    setQuizAnswerRevealed(true)
  }

  const handleQuizNext = () => {
    if (quizSelectedAnswer === null) return
    const newAnswers = [...quizAllAnswers, quizSelectedAnswer]
    setQuizAllAnswers(newAnswers)
    setQuizQuestionIndex(i => i + 1)
    setQuizSelectedAnswer(null)
    setQuizAnswerRevealed(false)
  }

  const handleQuizFinish = async () => {
    if (!lessonContent || !currentMissionId || !params.userId || quizSelectedAnswer === null) return
    const finalAnswers = [...quizAllAnswers, quizSelectedAnswer]

    // Score locally first for immediate feedback
    const mission = lessonContent.missions.find(m => m.id === currentMissionId)
    const questions = mission?.questions ?? []
    let correct = 0
    const localResults: QuizAnswerResult[] = questions.map((q, i) => {
      const selected = finalAnswers[i] ?? -1
      const is_correct = selected === q.correct_index
      if (is_correct) correct++
      return { question_index: i, selected, correct_index: q.correct_index, is_correct, explanation: q.explanation }
    })

    setQuizResult({
      results: localResults,
      score: correct,
      total: questions.length,
      passed: correct >= Math.max(1, Math.round(questions.length * 0.67)),
      mission_completed: true,
      lesson_now_required_complete: false,
      lesson_now_fully_complete: false,
      xp_earned: 20,
    })

    // Submit to server for XP/progress in background
    setQuizSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/lesson/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: params.userId,
          lesson_key: lessonContent.lesson_key ?? params.lessonKey,
          mission_id: currentMissionId,
          answers: finalAnswers,
        }),
      })
      if (res.ok) {
        const data: QuizResult = await res.json()
        setQuizResult(data)
        if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
          hasSignaledComplete.current = true
          params.onComplete(params.lessonId)
        }
        if (data.lesson_now_fully_complete) {
          params.onFullyComplete?.(params.lessonKey)
        }
        setMissionProgress(prev => ({
          completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
          is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
          is_fully_complete: prev?.is_fully_complete ?? false,
        }))
      }
    } catch { /* local result already shown */ } finally {
      setQuizSubmitting(false)
    }
  }

  // ── Exit lesson ─────────────────────────────────────────────────────────────
  const handleExit = () => {
    if (missionProgress?.is_required_complete && !hasSignaledComplete.current) {
      hasSignaledComplete.current = true
      params.onComplete(params.lessonId)
    }
    navigation.goBack()
  }

  // ── Share to feed ────────────────────────────────────────────────────────────
  const handleShareToFeed = async () => {
    if (!photoUri || !params.userId) return
    setSharePosting(true)
    try {
      const base64 = await new File(photoUri).base64()
      const res = await fetch(`${API_BASE}/social/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: params.userId,
          photo_base64: base64,
          display_name: user?.fullName ?? user?.firstName ?? null,
          caption: shareCaption.trim() || null,
          lesson_key: params.lessonKey,
          lesson_title: params.lessonTitle,
          chapter_title: params.chapterTitle,
          domain: params.domain,
        }),
      })
      if (res.ok) setSharePosted(true)
    } catch { /* ignore */ } finally {
      setSharePosting(false)
    }
  }

  // ── Reset between missions ──────────────────────────────────────────────────
  const resetSubmission = () => {
    setPhotoUri(null)
    setPhotoMimeType('image/jpeg')
    setSelectedReflection(null)
    setReflectionNote('')
    setValidationResult(null)
    setSubmitError(null)
    setShareCaption('')
    setSharePosted(false)
    setReflectionText('')
    setReflectionSubmitting(false)
    setQuizQuestionIndex(0)
    setQuizSelectedAnswer(null)
    setQuizAnswerRevealed(false)
    setQuizAllAnswers([])
    setQuizResult(null)
    // Reset card3 inline checkpoints
    setCard3CheckAnswer(null)
    setCard3CheckRevealed(false)
    setCard3ReflectText('')
    setCard3ReflectSubmitting(false)
    setCard3ReflectFeedback(null)
  }
  resetSubmissionRef.current = resetSubmission

  // ── Interpolations ──────────────────────────────────────────────────────────
  const chevronDeg = chevronRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const expandMaxHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] })

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorCard}>
          <Companion size={80} mood="sad" />
          <Text style={styles.errorTitle}>Couldn't load lesson</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable onPress={fetchLesson} style={[styles.primaryBtn, shadows.mint]}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // ── Card renderers ──────────────────────────────────────────────────────────

  // Image gallery helper (stateless)
  const renderImageGallery = (images: ImageItem[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 16 }}
      contentContainerStyle={{ gap: 12, paddingRight: 8 }}
    >
      {images.map((img, i) => (
        <View key={i} style={styles.galleryItem}>
          <Image
            source={{ uri: img.url }}
            style={styles.galleryImage}
            resizeMode="cover"
          />
          {!!img.caption && (
            <Text style={styles.galleryCaption}>{img.caption}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  )

  // Card 0: Hook
  const renderCard0 = () => {
    const isReady = !loading && !!lessonContent
    const priorFeedback = lessonContent?.last_reflection_feedback

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        {/* Prior session feedback banner */}
        {isReady && !!priorFeedback && (
          <View style={styles.priorFeedbackCard}>
            <Text style={styles.priorFeedbackLabel}>From last session</Text>
            <Text style={styles.priorFeedbackText}>{priorFeedback}</Text>
          </View>
        )}

        <View style={styles.companionCenter}>
          <Companion size={100} mood={isReady ? 'happy' : 'thinking'} />
        </View>
        <View style={styles.speechBubbleTail} />
        <View style={styles.speechBubble}>
          {isReady ? (
            <>
              <Text style={styles.hookSectionLabel}>Motivation</Text>
              <Text style={styles.hookMotivation}>{lessonContent!.card1.motivation}</Text>
              <View style={styles.hookDivider} />
              <Text style={styles.hookSectionLabel}>In this lesson you'll learn how to…</Text>
              {lessonContent!.card1.learn_points.map((point, i) => {
                const p = toAnnotatedPoint(point)
                return (
                  <AnnotatedText
                    key={i}
                    text={p.text}
                    source_ids={p.source_ids}
                    sourceMap={sourceMap}
                    textStyle={styles.hookBulletText}
                    bulletDotStyle={styles.hookBulletDot}
                    quote={p.quote}
                    quote_author={p.quote_author}
                    quote_book={p.quote_book}
                    quote_page={p.quote_page}
                  />
                )
              })}
            </>
          ) : (
            <>
              <Text style={styles.hookSectionLabel}>Motivation</Text>
              <Text style={styles.hookMotivation}>Garlic is getting ready...</Text>
              <View style={styles.hookDivider} />
            </>
          )}
        </View>
        {isReady && lessonContent?.card1.images?.length ? renderImageGallery(lessonContent.card1.images) : null}
        <View style={styles.spacer} />
        <Pressable
          onPress={() => isReady && advanceCard(CARD_DEEP_DIVE)}
          style={[styles.primaryBtn, shadows.mint, !isReady && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Let's go →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // Quiz checkpoint renderer (for card3)
  const renderQuizCheckpoint = (checkpoint: QuizCheckpointData) => (
    <View style={styles.checkpointCard}>
      <Text style={styles.checkpointLabel}>Quick Check</Text>
      <Text style={styles.checkpointQuestion}>{checkpoint.question}</Text>
      <View style={styles.quizOptions}>
        {checkpoint.options.map((opt, i) => {
          const isSelected = card3CheckAnswer === i
          const isCorrect = i === checkpoint.correct_index
          let optStyle = styles.quizOption as any
          if (card3CheckRevealed) {
            if (isCorrect) optStyle = { ...optStyle, ...styles.quizOptionCorrect }
            else if (isSelected) optStyle = { ...optStyle, ...styles.quizOptionWrong }
          } else if (isSelected) {
            optStyle = { ...optStyle, ...styles.quizOptionSelected }
          }
          return (
            <Pressable
              key={i}
              onPress={() => {
                if (card3CheckRevealed) return
                setCard3CheckAnswer(i)
                setCard3CheckRevealed(true)
              }}
              style={optStyle}
              disabled={card3CheckRevealed}
            >
              <Text style={styles.quizOptionText}>{opt}</Text>
            </Pressable>
          )
        })}
      </View>
      {card3CheckRevealed && (
        <View style={styles.quizExplanation}>
          <Text style={styles.quizExplanationText}>{checkpoint.explanation}</Text>
        </View>
      )}
    </View>
  )

  // Reflection checkpoint renderer (for card3)
  const renderReflectionCheckpoint = (checkpoint: ReflectionCheckpointData) => {
    const wordCount = card3ReflectText.trim().split(/\s+/).filter(Boolean).length
    const minWords = checkpoint.min_words ?? 30

    if (card3ReflectFeedback) {
      return (
        <View style={styles.reflectCheckpointCard}>
          <Text style={styles.checkpointLabel}>Pepper's Thoughts</Text>
          <Text style={styles.bodyTextMuted}>{card3ReflectFeedback}</Text>
        </View>
      )
    }

    return (
      <View style={styles.reflectCheckpointCard}>
        <Text style={styles.checkpointLabel}>Reflect (optional)</Text>
        <Text style={styles.checkpointQuestion}>{checkpoint.prompt}</Text>
        <TextInput
          style={styles.journalInput}
          multiline
          numberOfLines={4}
          placeholder="Your thoughts…"
          placeholderTextColor={colors.muted}
          value={card3ReflectText}
          onChangeText={setCard3ReflectText}
          textAlignVertical="top"
        />
        <Text style={[styles.wordCount, wordCount >= minWords && styles.wordCountMet]}>
          {wordCount} / {minWords} words
        </Text>
        <Pressable
          onPress={handleCard3ReflectSubmit}
          disabled={card3ReflectSubmitting || !card3ReflectText.trim()}
          style={[
            styles.primaryBtn,
            shadows.mint,
            (card3ReflectSubmitting || !card3ReflectText.trim()) && styles.btnDisabled,
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {card3ReflectSubmitting ? 'Reading…' : 'Share with Pepper →'}
          </Text>
        </Pressable>
      </View>
    )
  }

  // Card 1: Deep Dive
  const renderCard2 = () => {
    if (!lessonContent) return null
    const { card3 } = lessonContent

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionRow}>
          <Companion size={60} mood="idle" />
        </View>
        <Text style={styles.card3Headline}>{card3.headline}</Text>
        {card3.images?.length ? renderImageGallery(card3.images) : null}
        <View style={styles.bulletList}>
          {card3.points.map((point, i) => {
            const p = toAnnotatedPoint(point)
            return (
              <AnnotatedText
                key={i}
                text={p.text}
                source_ids={p.source_ids}
                sourceMap={sourceMap}
                textStyle={styles.bulletText}
                bulletDotStyle={styles.bulletDot}
                quote={p.quote}
                quote_author={p.quote_author}
                quote_book={p.quote_book}
                quote_page={p.quote_page}
              />
            )
          })}
        </View>
        <Pressable onPress={toggleTellMeMore} style={styles.tellMeMoreToggle}>
          <Animated.Text style={[styles.chevron, { transform: [{ rotate: chevronDeg }] }]}>
            ▾
          </Animated.Text>
          <Text style={styles.tellMeMoreLabel}>Tell me more</Text>
        </Pressable>
        <Animated.View style={{ maxHeight: expandMaxHeight, overflow: 'hidden' }}>
          <Text style={styles.bodyTextMuted}>{card3.tell_me_more}</Text>
        </Animated.View>
        <View style={styles.spacer} />
        <Pressable onPress={() => advanceCard(hasInteractiveCard ? (CARD_INTERACTIVE as number) : CARD_MISSIONS)} style={[styles.primaryBtn, shadows.mint]}>
          <Text style={styles.primaryBtnText}>{hasInteractiveCard ? 'Check your understanding →' : 'See missions →'}</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // Card 1.5: Interactive Checkpoint (quiz or reflection — only if present)
  const renderCardInteractive = () => {
    if (!lessonContent?.card3) return null
    const { quiz_checkpoint, reflection_prompt } = lessonContent.card3

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionRow}>
          <Companion size={60} mood="thinking" />
        </View>
        {quiz_checkpoint ? renderQuizCheckpoint(quiz_checkpoint) : null}
        {reflection_prompt ? renderReflectionCheckpoint(reflection_prompt) : null}
        <View style={styles.spacer} />
        <Pressable onPress={() => advanceCard(CARD_MISSIONS)} style={[styles.primaryBtn, shadows.mint]}>
          <Text style={styles.primaryBtnText}>See missions →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // Card 2: Missions List
  const renderCard3 = () => {
    if (!lessonContent) return null
    const { missions } = lessonContent
    const completedIds = new Set(missionProgress?.completed_missions ?? [])
    const requiredMissions = missions.filter(m => m.is_required)
    const optionalMissions = missions.filter(m => !m.is_required)
    const isRequiredComplete = missionProgress?.is_required_complete ?? false

    const missionTypeIcon = (type: string) => {
      if (type === 'pop_quiz') return '🎯'
      if (type === 'reflection_journal') return '📝'
      if (type.startsWith('minigame_')) return '🎮'
      return '📷'
    }

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.missionsHeader}>
          <Companion size={60} mood={isRequiredComplete ? 'excited' : 'happy'} />
          <View style={styles.missionsHeaderText}>
            <Text style={styles.sectionHeading}>Missions</Text>
            {isRequiredComplete && (
              <View style={styles.completeBadge}>
                <Text style={styles.completeBadgeText}>Required done ✓</Text>
              </View>
            )}
          </View>
        </View>

        {requiredMissions.map(mission => {
          const isDone = completedIds.has(mission.id)
          return (
            <Pressable
              key={mission.id}
              onPress={() => { setCurrentMissionId(mission.id); advanceCard(CARD_SUBMISSION) }}
              style={[styles.missionItem, isDone && styles.missionItemDone]}
            >
              <View style={styles.missionItemBody}>
                <View style={styles.missionItemTop}>
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>Required</Text>
                  </View>
                  <Text style={styles.missionTypeIcon}>{missionTypeIcon(mission.mission_type)}</Text>
                  {isDone && <Text style={styles.missionDoneCheck}>✓</Text>}
                </View>
                <Text style={[styles.missionTitle, isDone && styles.missionTitleDone]}>
                  {mission.title}
                </Text>
                <Text style={styles.missionMeta}>~{mission.duration_minutes} min</Text>
              </View>
              {!isDone && <Text style={styles.missionArrow}>→</Text>}
            </Pressable>
          )
        })}

        {optionalMissions.length > 0 && (
          <>
            <Text style={styles.optionalHeading}>Extra Credit</Text>
            {optionalMissions.map(mission => {
              const isDone = completedIds.has(mission.id)
              return (
                <Pressable
                  key={mission.id}
                  onPress={() => { setCurrentMissionId(mission.id); advanceCard(CARD_SUBMISSION) }}
                  style={[styles.missionItem, styles.missionItemOptional, isDone && styles.missionItemDone]}
                >
                  <View style={styles.missionItemBody}>
                    <View style={styles.missionItemTop}>
                      <Text style={styles.missionTypeIcon}>{missionTypeIcon(mission.mission_type)}</Text>
                    </View>
                    <Text style={[styles.missionTitle, isDone && styles.missionTitleDone]}>
                      {mission.title}
                    </Text>
                    <Text style={styles.missionMeta}>~{mission.duration_minutes} min · optional</Text>
                  </View>
                  {isDone
                    ? <Text style={styles.missionDoneCheck}>✓</Text>
                    : <Text style={styles.missionArrow}>→</Text>
                  }
                </Pressable>
              )
            })}
          </>
        )}

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Review:</Text>
          <Pressable onPress={() => advanceCard(CARD_HOOK)} style={styles.reviewBtn}>
            <Text style={styles.reviewBtnText}>Intro</Text>
          </Pressable>
          <Pressable onPress={() => advanceCard(CARD_DEEP_DIVE)} style={styles.reviewBtn}>
            <Text style={styles.reviewBtnText}>Deep Dive</Text>
          </Pressable>
        </View>

        <View style={styles.spacer} />
        <Pressable onPress={handleExit} style={[styles.primaryBtn, isRequiredComplete ? shadows.mint : styles.exitBtnMuted]}>
          <Text style={styles.primaryBtnText}>
            {isRequiredComplete ? 'Back to your path →' : 'Exit lesson'}
          </Text>
        </Pressable>
      </ScrollView>
    )
  }

  // Card 3: Mission Submission (branches on mission_type)
  const renderCard4 = () => {
    if (!lessonContent || !currentMissionId) return null
    const mission = lessonContent.missions.find(m => m.id === currentMissionId)
    if (!mission) return null

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => advanceCard(CARD_MISSIONS)} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back to missions</Text>
        </Pressable>
        <View style={styles.companionRow}>
          <Companion size={60} mood="happy" />
        </View>
        <View style={styles.missionBanner}>
          {mission.is_required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          )}
          <Text style={styles.sectionHeading}>{mission.title}</Text>
          <Text style={styles.missionWhyText}>{mission.why_it_matters}</Text>
        </View>
        <View style={styles.descriptionCallout}>
          <Text style={styles.bodyText}>{mission.description}</Text>
        </View>

        {mission.mission_type === 'photo_submission' && renderPhotoSubmission(mission)}
        {mission.mission_type === 'reflection_journal' && renderReflectionJournal(mission)}
        {mission.mission_type === 'pop_quiz' && renderPopQuiz(mission)}
        {mission.mission_type === 'minigame_matching' && renderMinigameMatching(mission)}
        {mission.mission_type === 'minigame_image_id' && renderMinigameImageId(mission)}
        {mission.mission_type === 'minigame_sequencing' && renderMinigameSequencing(mission)}
        {mission.mission_type === 'minigame_fill_blank' && renderMinigameFillBlank(mission)}
      </ScrollView>
    )
  }

  // ── Photo submission UI ─────────────────────────────────────────────────────
  const renderPhotoSubmission = (mission: Mission) => {
    const canSubmit = !!photoUri

    return (
      <>
        <View style={styles.focusCallout}>
          <Text style={styles.focusCalloutText}>{mission.prompt}</Text>
        </View>

        {!photoUri ? (
          <Pressable onPress={handleAddPhoto} style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoPlaceholderText}>Add a photo</Text>
          </Pressable>
        ) : (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <Pressable onPress={handleAddPhoto} style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>× Change</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.reflectionContainer}>
          <Text style={styles.reflectionLabel}>Things you noticed</Text>
          <TextInput
            style={styles.reflectionInput}
            value={reflectionNote}
            onChangeText={setReflectionNote}
            placeholder="Optional — jot down what you observed..."
            placeholderTextColor={colors.muted + '99'}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Pressable
          onPress={handlePhotoSubmit}
          disabled={!canSubmit}
          hitSlop={8}
          style={[styles.primaryBtn, shadows.mint, !canSubmit && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Submit →</Text>
        </Pressable>
      </>
    )
  }

  // ── Reflection journal UI ───────────────────────────────────────────────────
  const renderReflectionJournal = (mission: Mission) => {
    const wordCount = reflectionText.trim().split(/\s+/).filter(Boolean).length
    const minWords = mission.min_words ?? 30
    const canSubmit = reflectionText.trim().length > 0 && !!params.userId

    return (
      <>
        <View style={styles.focusCallout}>
          <Text style={styles.focusCalloutText}>{mission.prompt}</Text>
        </View>

        <TextInput
          style={styles.journalInput}
          multiline
          numberOfLines={6}
          placeholder="Write your reflection here…"
          placeholderTextColor={colors.muted}
          value={reflectionText}
          onChangeText={setReflectionText}
          textAlignVertical="top"
        />

        <Text style={[styles.wordCount, wordCount >= minWords && styles.wordCountMet]}>
          {wordCount} / {minWords} words suggested
        </Text>

        <Pressable
          onPress={handleReflectionSubmit}
          disabled={!canSubmit}
          style={[styles.primaryBtn, shadows.mint, !canSubmit && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Submit reflection →</Text>
        </Pressable>
      </>
    )
  }

  // ── Pop quiz UI ─────────────────────────────────────────────────────────────
  const renderPopQuiz = (mission: Mission) => {
    const questions = mission.questions ?? []

    // Quiz complete — show results
    if (quizResult) {
      const xpAnim = xpScale
      return (
        <View>
          <View style={styles.quizScoreCard}>
            <Text style={styles.quizScoreText}>
              {quizResult.score}/{quizResult.total} correct
            </Text>
            <Text style={styles.quizPassLabel}>
              {quizResult.passed ? 'Nice work!' : 'Keep at it'}
            </Text>
          </View>

          {quizResult.results.map((r, i) => (
            <View
              key={i}
              style={[styles.quizResultRow, r.is_correct ? styles.quizResultCorrect : styles.quizResultWrong]}
            >
              <Text style={styles.quizResultQ}>{questions[i]?.question_text}</Text>
              <Text style={styles.quizResultExplanation}>{r.explanation}</Text>
            </View>
          ))}

          <View style={styles.xpRow}>
            <Animated.View style={[styles.xpBadge, { transform: [{ scale: xpAnim }] }]}>
              <Text style={styles.xpBadgeText}>✦ +{quizResult.xp_earned} XP</Text>
            </Animated.View>
          </View>

          <Pressable
            onPress={() => { resetSubmission(); advanceCard(2) }}
            style={[styles.primaryBtn, shadows.mint, { marginTop: 8 }]}
          >
            <Text style={styles.primaryBtnText}>Back to missions →</Text>
          </Pressable>
          <Pressable onPress={handleExit} style={styles.exitBtn}>
            <Text style={styles.exitBtnText}>Exit lesson</Text>
          </Pressable>
        </View>
      )
    }

    // Active question
    if (quizQuestionIndex >= questions.length) return null
    const q = questions[quizQuestionIndex]
    const isLast = quizQuestionIndex === questions.length - 1

    return (
      <View>
        <Text style={styles.quizProgress}>
          Question {quizQuestionIndex + 1} of {questions.length}
        </Text>
        <Text style={styles.quizQuestion}>{q.question_text}</Text>

        <View style={styles.quizOptions}>
          {q.options.map((option, i) => {
            const isSelected = quizSelectedAnswer === i
            const isCorrect = i === q.correct_index
            let optStyle = styles.quizOption
            if (quizAnswerRevealed) {
              if (isCorrect) optStyle = { ...optStyle, ...styles.quizOptionCorrect } as typeof optStyle
              else if (isSelected) optStyle = { ...optStyle, ...styles.quizOptionWrong } as typeof optStyle
            } else if (isSelected) {
              optStyle = { ...optStyle, ...styles.quizOptionSelected } as typeof optStyle
            }

            return (
              <Pressable key={i} onPress={() => handleQuizAnswer(i)} style={optStyle} disabled={quizAnswerRevealed}>
                <Text style={styles.quizOptionText}>{option}</Text>
              </Pressable>
            )
          })}
        </View>

        {quizAnswerRevealed && (
          <View style={styles.quizExplanation}>
            <Text style={styles.quizExplanationText}>{q.explanation}</Text>
          </View>
        )}

        {quizAnswerRevealed && (
          <Pressable
            onPress={isLast ? handleQuizFinish : handleQuizNext}
            disabled={quizSubmitting}
            style={[styles.primaryBtn, shadows.mint, { marginTop: 16 }]}
          >
            <Text style={styles.primaryBtnText}>
              {isLast ? 'See results →' : 'Next question →'}
            </Text>
          </Pressable>
        )}
      </View>
    )
  }

  // ── Minigame: Matching ───────────────────────────────────────────────────────
  const renderMinigameMatching = (mission: Mission) => {
    const pairs = mission.pairs ?? []
    if (pairs.length === 0) return <Text style={styles.bodyText}>No pairs to match</Text>

    const handleMinigameComplete = async () => {
      if (!lessonContent || !currentMissionId || !params.userId) return
      setMinigameSubmitting(true)
      try {
        const res = await fetch(`${API_BASE}/lesson/minigame-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: params.userId,
            lesson_key: lessonContent.lesson_key ?? params.lessonKey,
            mission_id: currentMissionId,
            passed: true,
          }),
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = await res.json()
        if (data.mission_completed) {
          setMissionProgress(prev => ({
            completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
            is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
            is_fully_complete: prev?.is_fully_complete ?? false,
          }))
          if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
            hasSignaledComplete.current = true
            params.onComplete(params.lessonId)
          }
        }
        setMinigameResult({ passed: true, feedback: 'Great matching!' })
        advanceCard(CARD_FEEDBACK)
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit')
      } finally {
        setMinigameSubmitting(false)
      }
    }

    return (
      <>
        <Text style={styles.sectionHeading}>Match the pairs</Text>
        <View style={styles.matchingGrid}>
          {pairs.slice(0, 4).map((pair, i) => (
            <View key={i} style={styles.matchingPair}>
              <Pressable style={[styles.matchingPill, { backgroundColor: colors.sky + '33' }]}>
                <Text style={styles.matchingPillText}>{pair.left}</Text>
              </Pressable>
              <Text style={styles.matchingConnector}>↔</Text>
              <Pressable style={[styles.matchingPill, { backgroundColor: colors.peach + '33' }]}>
                <Text style={styles.matchingPillText}>{pair.right}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View style={styles.spacer} />
        <Pressable
          onPress={handleMinigameComplete}
          disabled={minigameSubmitting}
          style={[styles.primaryBtn, shadows.mint, minigameSubmitting && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Submit matches →</Text>
        </Pressable>
      </>
    )
  }

  // ── Minigame: Image ID ───────────────────────────────────────────────────────
  const renderMinigameImageId = (mission: Mission) => {
    const images = mission.images ?? []
    if (images.length === 0) return <Text style={styles.bodyText}>No images to identify</Text>

    const handleImageSelect = async (index: number) => {
      setSelectedImageIndex(index)
      if (!lessonContent || !currentMissionId || !params.userId) return
      setMinigameSubmitting(true)
      try {
        const res = await fetch(`${API_BASE}/lesson/minigame-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: params.userId,
            lesson_key: lessonContent.lesson_key ?? params.lessonKey,
            mission_id: currentMissionId,
            passed: index === mission.correct_image_index,
          }),
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = await res.json()
        if (data.mission_completed) {
          setMissionProgress(prev => ({
            completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
            is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
            is_fully_complete: prev?.is_fully_complete ?? false,
          }))
          if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
            hasSignaledComplete.current = true
            params.onComplete(params.lessonId)
          }
        }
        const passed = index === mission.correct_image_index
        setMinigameResult({ passed, feedback: passed ? '✓ Correct!' : '✗ Not quite—try the others' })
        advanceCard(CARD_FEEDBACK)
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit')
      } finally {
        setMinigameSubmitting(false)
      }
    }

    return (
      <>
        <Text style={styles.sectionHeading}>Which one is it?</Text>
        <View style={styles.imageGrid}>
          {images.map((img, i) => (
            <Pressable
              key={i}
              onPress={() => handleImageSelect(i)}
              disabled={minigameSubmitting}
              style={[
                styles.imageOption,
                selectedImageIndex === i && styles.imageOptionSelected,
                minigameSubmitting && styles.btnDisabled,
              ]}
            >
              <Text style={styles.imageOptionText}>{img}</Text>
            </Pressable>
          ))}
        </View>
      </>
    )
  }

  // ── Minigame: Sequencing ─────────────────────────────────────────────────────
  const renderMinigameSequencing = (mission: Mission) => {
    const steps = mission.steps ?? []
    if (steps.length === 0) return <Text style={styles.bodyText}>No steps to sequence</Text>

    const handleSequenceComplete = async () => {
      if (!lessonContent || !currentMissionId || !params.userId) return
      setMinigameSubmitting(true)
      try {
        const res = await fetch(`${API_BASE}/lesson/minigame-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: params.userId,
            lesson_key: lessonContent.lesson_key ?? params.lessonKey,
            mission_id: currentMissionId,
            passed: true,
          }),
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = await res.json()
        if (data.mission_completed) {
          setMissionProgress(prev => ({
            completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
            is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
            is_fully_complete: prev?.is_fully_complete ?? false,
          }))
          if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
            hasSignaledComplete.current = true
            params.onComplete(params.lessonId)
          }
        }
        setMinigameResult({ passed: true, feedback: 'Perfect order!' })
        advanceCard(CARD_FEEDBACK)
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit')
      } finally {
        setMinigameSubmitting(false)
      }
    }

    return (
      <>
        <Text style={styles.sectionHeading}>Put these in order</Text>
        <View style={styles.sequenceList}>
          {stepOrder.length === 0 ? (
            steps.map((step, i) => (
              <View key={i} style={styles.sequenceItem}>
                <Text style={styles.sequenceNumber}>{i + 1}.</Text>
                <Text style={styles.sequenceText}>{step}</Text>
              </View>
            ))
          ) : (
            stepOrder.map((step, i) => (
              <View key={i} style={styles.sequenceItem}>
                <Text style={styles.sequenceNumber}>{i + 1}.</Text>
                <Text style={styles.sequenceText}>{step}</Text>
              </View>
            ))
          )}
        </View>
        <View style={styles.spacer} />
        <Pressable
          onPress={handleSequenceComplete}
          disabled={minigameSubmitting}
          style={[styles.primaryBtn, shadows.mint, minigameSubmitting && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Check order →</Text>
        </Pressable>
      </>
    )
  }

  // ── Minigame: Fill Blank ─────────────────────────────────────────────────────
  const renderMinigameFillBlank = (mission: Mission) => {
    const sentence = mission.fill_blank_sentence ?? ''
    if (!sentence) return <Text style={styles.bodyText}>No question available</Text>

    const handleFillBlankSubmit = async () => {
      if (!fillBlankAnswer.trim() || !lessonContent || !currentMissionId || !params.userId) return
      setMinigameSubmitting(true)
      try {
        const res = await fetch(`${API_BASE}/lesson/grade-fill-blank`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: params.userId,
            lesson_key: lessonContent.lesson_key ?? params.lessonKey,
            mission_id: currentMissionId,
            user_answer: fillBlankAnswer.trim(),
            correct_answer: mission.fill_blank_answer ?? '',
            lesson_title: params.lessonTitle,
            goal: params.goal,
          }),
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = await res.json()
        if (data.mission_completed) {
          setMissionProgress(prev => ({
            completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
            is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
            is_fully_complete: prev?.is_fully_complete ?? false,
          }))
          if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
            hasSignaledComplete.current = true
            params.onComplete(params.lessonId)
          }
        }
        setMinigameResult({ passed: data.correct, feedback: data.feedback })
        advanceCard(CARD_FEEDBACK)
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit')
      } finally {
        setMinigameSubmitting(false)
      }
    }

    return (
      <>
        <Text style={styles.sectionHeading}>Fill in the blank</Text>
        <View style={styles.fillBlankContainer}>
          <Text style={styles.fillBlankSentence}>{sentence}</Text>
        </View>
        <TextInput
          style={styles.fillBlankInput}
          placeholder="Your answer…"
          placeholderTextColor={colors.muted}
          value={fillBlankAnswer}
          onChangeText={setFillBlankAnswer}
        />
        <View style={styles.spacer} />
        <Pressable
          onPress={handleFillBlankSubmit}
          disabled={!fillBlankAnswer.trim() || minigameSubmitting}
          style={[styles.primaryBtn, shadows.mint, (!fillBlankAnswer.trim() || minigameSubmitting) && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Submit answer →</Text>
        </Pressable>
      </>
    )
  }

  // Card 4: Feedback (photo + reflection journal results)
  const renderCard5 = () => {
    if (submitError) {
      return (
        <View style={styles.feedbackLoading}>
          <Companion size={100} mood="sad" />
          <Text style={styles.loadingText}>Submission failed</Text>
          <Text style={[styles.bodyTextMuted, { textAlign: 'center', marginTop: 8 }]}>{submitError}</Text>
          <Pressable
            onPress={() => { setSubmitError(null); advanceCard(CARD_SUBMISSION) }}
            style={[styles.primaryBtn, shadows.mint, { marginTop: 24 }]}
          >
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )
    }

    const isLoading = validating || reflectionSubmitting
    if (isLoading || !validationResult) {
      const loadingMsg = reflectionSubmitting ? 'Reading your reflection…' : 'Reviewing your work…'
      return (
        <View style={styles.feedbackLoading}>
          <Companion size={100} mood="thinking" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.loadingDot, { opacity: dot1 }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot2 }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot3 }]} />
          </View>
        </View>
      )
    }

    const isRequiredComplete = missionProgress?.is_required_complete ?? false

    const companionMood = validationResult.is_relevant === false
      ? 'thinking'
      : validationResult.mission_completed
        ? 'excited'
        : 'happy'

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <Animated.View style={{ transform: [{ scale: companionScale }] }}>
            <Companion size={100} mood={companionMood} />
          </Animated.View>
        </View>
        {validationResult.is_relevant === false ? (
          // Rejected — wrong subject
          <Animated.View style={[styles.messageCard, { opacity: feedbackOpacity }]}>
            <Text style={[styles.bodyText, { textAlign: 'center' }]}>
              {validationResult.rejection_message}
            </Text>
          </Animated.View>
        ) : validationResult.criteria ? (
          // Scoreboard (photo submissions, relevant)
          <Animated.View style={[styles.scoreboardCard, { opacity: feedbackOpacity }]}>
            {validationResult.criteria.slice(0, 4).map((c, i) => (
              <View key={i} style={styles.criterionRow}>
                <Text style={styles.criterionLabel}>{c.label}</Text>
                <Text style={styles.criterionStars}>
                  {'★'.repeat(c.stars)}{'☆'.repeat(5 - c.stars)}
                </Text>
              </View>
            ))}
            <View style={styles.scoreboardDivider} />
            <Text style={styles.scoreboardNote}>{validationResult.note}</Text>
          </Animated.View>
        ) : (
          // Original paragraph (reflection journals, fallback)
          <Animated.View style={[styles.messageCard, { opacity: feedbackOpacity }]}>
            <Text style={styles.bodyText}>{validationResult.feedback}</Text>
          </Animated.View>
        )}
        {validationResult.mission_completed && (
          <View style={styles.xpRow}>
            <Animated.View style={[styles.xpBadge, { transform: [{ scale: xpScale }] }]}>
              <Text style={styles.xpBadgeText}>✦ +{validationResult.xp_earned} XP</Text>
            </Animated.View>
          </View>
        )}
        {validationResult.lesson_now_required_complete && (
          <Animated.View style={[styles.requiredCompleteCard, { opacity: feedbackOpacity }]}>
            <Text style={styles.requiredCompleteText}>Required missions complete! Next lesson unlocked 🎉</Text>
          </Animated.View>
        )}

        {/* Share to feed — photo missions only */}
        {(validationResult as ValidationResult).is_valid === true && photoUri && (
          <Animated.View style={[styles.shareCard, { opacity: feedbackOpacity }]}>
            {sharePosted ? (
              <View style={styles.shareSuccessRow}>
                <Text style={styles.shareSuccessText}>Posted to feed ✓</Text>
              </View>
            ) : (
              <>
                <Text style={styles.shareCardTitle}>Share your progress?</Text>
                <Text style={styles.shareCardSub}>{params.lessonTitle}</Text>
                <TextInput
                  style={styles.shareCaptionInput}
                  placeholder="Add a caption… (optional)"
                  placeholderTextColor={colors.muted}
                  value={shareCaption}
                  onChangeText={setShareCaption}
                  maxLength={200}
                />
                <Pressable
                  onPress={handleShareToFeed}
                  disabled={sharePosting}
                  style={[styles.shareBtn, sharePosting && styles.btnDisabled]}
                >
                  <Text style={styles.shareBtnText}>
                    {sharePosting ? 'Posting…' : 'Post to Feed'}
                  </Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}

        <View style={styles.spacer} />
        <Pressable
          onPress={() => { resetSubmission(); advanceCard(CARD_MISSIONS) }}
          style={[styles.primaryBtn, shadows.mint]}
        >
          <Text style={styles.primaryBtnText}>Next mission →</Text>
        </Pressable>
        <Pressable onPress={handleExit} style={styles.exitBtn}>
          <Text style={[styles.exitBtnText, !isRequiredComplete && { color: colors.muted }]}>
            {isRequiredComplete ? 'Back to your path' : 'Exit lesson'}
          </Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Card dispatch ───────────────────────────────────────────────────────────
  const cards = [
    renderCard0,
    renderCard2,
    ...(hasInteractiveCard ? [renderCardInteractive] : []),
    renderCard3,
    renderCard4,
    renderCard5,
  ]

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.exitButton} onPress={handleExit} hitSlop={8}>
        <Text style={styles.exitButtonText}>×</Text>
      </Pressable>
      <ProgressIndicator current={cardIndex} progressAnim={progressAnim} totalCards={TOTAL_CARDS} />
      <Animated.View
        style={[
          styles.cardWrapper,
          { opacity: cardOpacity, transform: [{ translateX: cardTranslateX }] },
        ]}
        {...swipeResponder.panHandlers}
      >
        {cards[cardIndex]?.()}
      </Animated.View>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  exitButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  exitButtonText: {
    fontSize: 28,
    color: colors.muted,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 28,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },

  cardContent: { flexGrow: 1 },
  spacer: { flex: 1, minHeight: 24 },

  companionCenter: { alignItems: 'center', marginBottom: 24 },
  companionRow: { alignItems: 'flex-start', marginBottom: 16 },

  messageCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    marginBottom: 24,
  },

  bodyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: colors.foreground,
    marginBottom: 16,
  },
  bodyTextMuted: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.muted,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
    marginBottom: 12,
  },

  primaryBtn: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
  },
  exitBtnMuted: { backgroundColor: colors.card },
  exitBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  exitBtnText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
  },
  backLink: { paddingVertical: 4, paddingBottom: 12 },
  backLinkText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.muted,
  },

  // Tell me more
  tellMeMoreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  chevron: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    color: colors.muted,
    lineHeight: 22,
  },
  tellMeMoreLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.muted,
  },

  // Missions list
  missionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  missionsHeaderText: { flex: 1 },
  completeBadge: {
    backgroundColor: colors.mint + '33',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  completeBadgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.foreground,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 10,
  },
  missionItemOptional: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  missionItemDone: { opacity: 0.6 },
  missionItemBody: { flex: 1 },
  missionItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requiredBadge: {
    backgroundColor: colors.sky + '55',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  requiredBadgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.foreground,
  },
  missionTypeIcon: { fontSize: 14 },
  missionTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 2,
  },
  missionTitleDone: { textDecorationLine: 'line-through', color: colors.muted },
  missionMeta: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  missionDoneCheck: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 16,
    color: colors.mint,
  },
  missionArrow: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    color: colors.muted,
    marginLeft: 8,
  },
  optionalHeading: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  reviewLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  reviewBtn: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
  },

  // Mission submission
  missionBanner: { marginBottom: 8 },
  focusCallout: {
    backgroundColor: colors.golden + '33',
    borderLeftWidth: 3,
    borderLeftColor: colors.golden,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: 16,
  },
  focusCalloutText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
  },
  missionWhyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  descriptionCallout: {
    borderLeftWidth: 3,
    borderLeftColor: colors.peach,
    paddingLeft: 14,
    marginBottom: 16,
  },

  // Photo picker
  photoPlaceholder: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    marginBottom: 20,
    gap: 8,
  },
  photoIcon: { fontSize: 32 },
  photoPlaceholderText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.muted,
  },
  photoContainer: { marginBottom: 20, position: 'relative' },
  photoPreview: { width: '100%', height: 200, borderRadius: radius.md },
  changePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changePhotoText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },

  // Reflection pills
  reflectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  reflectionPill: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reflectionPillSelected: { backgroundColor: colors.mint },
  reflectionPillText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
  },
  reflectionPillTextSelected: { color: colors.foreground },

  // Photo submission reflection note
  reflectionContainer: { marginBottom: 24 },
  reflectionLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  reflectionInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Journal input
  journalInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 24,
    minHeight: 140,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordCount: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginBottom: 16,
  },
  wordCountMet: { color: colors.mint },

  // Pop quiz
  quizProgress: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quizQuestion: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
    lineHeight: 26,
    marginBottom: 20,
  },
  quizOptions: { gap: 10, marginBottom: 8 },
  quizOption: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  } as any,
  quizOptionSelected: { borderColor: colors.mint, backgroundColor: colors.mint + '22' },
  quizOptionCorrect: { backgroundColor: colors.mint + '44', borderColor: colors.mint },
  quizOptionWrong: { backgroundColor: colors.peach + '44', borderColor: colors.peach },
  quizOptionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
  },
  quizExplanation: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.sky,
  },
  quizExplanationText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
  },
  quizScoreCard: {
    backgroundColor: colors.mint + '33',
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  quizScoreText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 32,
    color: colors.foreground,
  },
  quizPassLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    marginTop: 4,
  },
  quizResultRow: {
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 8,
  },
  quizResultCorrect: { backgroundColor: colors.mint + '22' },
  quizResultWrong: { backgroundColor: colors.peach + '22' },
  quizResultQ: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 4,
  },
  quizResultExplanation: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },

  // Feedback loading
  feedbackLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
  },
  dotsRow: { flexDirection: 'row', gap: 8 },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mint,
  },

  // XP badge
  xpRow: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  xpBadge: {
    backgroundColor: colors.golden + '33',
    borderRadius: radius.sm,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...shadows.golden,
  },
  xpBadgeText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
  },

  // Required complete banner
  requiredCompleteCard: {
    backgroundColor: colors.mint + '33',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  requiredCompleteText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Prior session feedback
  priorFeedbackCard: {
    backgroundColor: colors.sky + '33',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.sky,
  },
  priorFeedbackLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  priorFeedbackText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
  },

  // Error state
  errorCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
    textAlign: 'center',
  },
  errorMsg: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Deep Dive card
  card3Headline: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
    lineHeight: 28,
    marginBottom: 12,
  },
  bulletList: { gap: 10, marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { color: colors.mint, fontSize: 18, lineHeight: 24 },
  bulletText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    flex: 1,
    lineHeight: 22,
  },

  // Hook card speech bubble
  speechBubbleTail: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.card,
    marginBottom: -1,
  },
  speechBubble: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    marginBottom: 24,
  },

  // Share to feed
  shareCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareCardTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 17,
    color: colors.foreground,
    marginBottom: 2,
  },
  shareCardSub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  shareCaptionInput: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  shareBtn: {
    backgroundColor: colors.peach,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.foreground,
  },
  shareSuccessRow: { alignItems: 'center', paddingVertical: 8 },
  shareSuccessText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
  },

  // Gallery styles
  galleryItem: {
    width: 280,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  galleryImage: {
    width: 280,
    height: 180,
  },
  galleryCaption: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
    padding: 8,
    lineHeight: 18,
  },

  // Checkpoint styles
  checkpointCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.sky,
  },
  checkpointLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.sky,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  checkpointQuestion: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 17,
    color: colors.foreground,
    lineHeight: 24,
    marginBottom: 12,
  },
  reflectCheckpointCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.peach,
  },

  // Hook card styles (new motivation + learn_points)
  hookSectionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  hookMotivation: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
    lineHeight: 26,
    marginBottom: 12,
  },
  hookDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  hookBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  hookBulletDot: { color: colors.mint, fontSize: 14, lineHeight: 22 },
  hookBulletText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    flex: 1,
    lineHeight: 22,
  },

  // Scoreboard card styles (new feedback format)
  scoreboardCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    marginBottom: 24,
  },
  criterionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  criterionLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    flex: 1,
  },
  criterionStars: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    color: colors.golden,
    letterSpacing: 1,
  },
  scoreboardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  scoreboardNote: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 23,
    fontStyle: 'italic',
  },

  // Minigame: Matching
  matchingGrid: {
    gap: 16,
    marginBottom: 24,
  },
  matchingPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchingPill: {
    flex: 1,
    borderRadius: radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  matchingPillText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    textAlign: 'center',
  },
  matchingConnector: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.muted,
  },

  // Minigame: Image ID
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  imageOption: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 2,
    borderColor: colors.border,
  },
  imageOptionSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.mint,
  },
  imageOptionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    textAlign: 'center',
  },

  // Minigame: Sequencing
  sequenceList: {
    gap: 12,
    marginBottom: 24,
  },
  sequenceItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'flex-start',
  },
  sequenceNumber: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.mint,
    minWidth: 24,
  },
  sequenceText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    flex: 1,
  },

  // Minigame: Fill Blank
  fillBlankContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  fillBlankSentence: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 24,
  },
  fillBlankInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
})
