import React, { useState, useRef, useEffect, useMemo } from 'react'
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
  term: string
  definition: string
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

interface Activity {
  id: string
  type: 'multiple_choice' | 'image_id' | 'matching' | 'fill_blank' | 'sequence'
  question?: string
  prompt?: string
  options?: string[]
  correct_index?: number | null
  explanation?: string
  pairs?: MatchingPair[]
  sentence?: string
  correct_answer?: string
  steps?: string[]
  correct_order?: number[]
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
  missions?: Mission[] // deprecated, for backward compat
  activities?: Activity[] // new: sequential activities
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

  // ─ Activity state (new) ────────────────────────────────────────────────────
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set())
  const [activityResults, setActivityResults] = useState<Record<string, { passed: boolean; explanation: string }>>({})
  const [lessonComplete, setLessonComplete] = useState(false)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Per-activity selection state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number | null>>({})
  const [matchState, setMatchState] = useState<Record<string, { leftSelected: string | null; rightSelected: string | null; matched: Record<string, string> }>>({})
  const [userOrders, setUserOrders] = useState<Record<string, number[]>>({})

  // Shuffled options for fill_blank (keyed by activity ID)
  const shuffledOptionsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    if (lessonContent?.activities) {
      for (const act of lessonContent.activities) {
        if (act.type === 'fill_blank' && act.options) {
          map[act.id] = [...act.options].sort(() => Math.random() - 0.5)
        }
      }
    }
    return map
  }, [lessonContent?.lesson_key])

  // Photo submission state (used for post-lesson modal)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/jpeg')
  const [shareCaption, setShareCaption] = useState('')
  const [sharePosting, setSharePosting] = useState(false)
  const [sharePosted, setSharePosted] = useState(false)

  // Shared
  const [tellMeMoreOpen, setTellMeMoreOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const hasSignaledComplete = useRef(false)
  const hasInitializedCard = useRef(false)

  // ── Dynamic card indices ────────────────────────────────────────────────────
  const activities = lessonContent?.activities ?? []
  const activityCount = activities.length
  const TOTAL_CARDS = 2 + activityCount + 1  // hook + deep_dive + N activities + completion
  const CARD_HOOK = 0
  const CARD_DEEP_DIVE = 1
  const CARD_FIRST_ACTIVITY = 2
  const CARD_COMPLETION = 2 + activityCount

  // Backward compat: if lessons still have missions instead of activities
  const hasMissionsOnly = !activityCount && !!(lessonContent?.missions?.length)

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

  // ── Initialize card index on first load ────────────────────────────────────────
  useEffect(() => {
    const ready = params.userId ? progressFetched && !!lessonContent : !!lessonContent
    if (!ready || hasInitializedCard.current) return
    hasInitializedCard.current = true
    // For activities, start at hook card (index 0)
    setCardIndex(0)
    progressAnim.setValue(0)
  }, [lessonContent, progressFetched])

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

  // ── Completion animations ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!lessonComplete) return
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
  }, [lessonComplete])

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

  // ── Mark activity complete ────────────────────────────────────────────────
  const markActivityComplete = async (activity: Activity, passed: boolean) => {
    if (!lessonContent || !params.userId) return

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/lesson/activity-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: params.userId,
          lesson_key: lessonContent.lesson_key ?? params.lessonKey,
          activity_id: activity.id,
          passed,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)

      // Mark as completed
      setCompletedActivities(prev => new Set([...prev, activity.id]))

      // Check if all activities are done
      if (completedActivities.size + 1 === activities.length) {
        setLessonComplete(true)
        if (!hasSignaledComplete.current) {
          hasSignaledComplete.current = true
          params.onComplete(params.lessonId)
        }
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
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
  // Reset function for activities (minimal - mostly for photo modal state)
  const resetSubmission = () => {
    setPhotoUri(null)
    setPhotoMimeType('image/jpeg')
    setShareCaption('')
    setSharePosted(false)
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
        <Pressable onPress={() => advanceCard(CARD_FIRST_ACTIVITY)} style={[styles.primaryBtn, shadows.mint]}>
          <Text style={styles.primaryBtnText}>Ready to practice? →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Activity renderers ────────────────────────────────────────────────────────

  const renderActivityCard = (activityIndex: number) => {
    const activity = activities[activityIndex]
    if (!activity) return null

    const isAnswered = !!activityResults[activity.id]
    const result = activityResults[activity.id]

    const handleSubmit = async (passed: boolean) => {
      await markActivityComplete(activity, passed)
      if (passed) {
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          if (activityIndex + 1 < activities.length) {
            advanceCard(CARD_FIRST_ACTIVITY + activityIndex + 1)
          } else {
            advanceCard(CARD_COMPLETION)
          }
        })
      }
    }

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.activityNumber}>
          Activity {activityIndex + 1} of {activities.length}
        </Text>

        {activity.type === 'multiple_choice' && renderActivityMultipleChoice(activity, isAnswered, result, handleSubmit)}
        {activity.type === 'image_id' && renderActivityImageId(activity, isAnswered, result, handleSubmit)}
        {activity.type === 'fill_blank' && renderActivityFillBlank(activity, isAnswered, result, handleSubmit)}
        {activity.type === 'matching' && renderActivityMatching(activity, isAnswered, result, handleSubmit)}
        {activity.type === 'sequence' && renderActivitySequence(activity, isAnswered, result, handleSubmit)}

        <View style={styles.spacer} />
      </ScrollView>
    )
  }

  const renderActivityMultipleChoice = (activity: Activity, isAnswered: boolean, result: any, onSubmit: (passed: boolean) => void) => {
    const selected = selectedOptions[activity.id]
    const isCorrect = selected === activity.correct_index

    return (
      <>
        <Text style={styles.activityQuestion}>{activity.question || activity.prompt}</Text>
        <View style={styles.optionsList}>
          {(activity.options || []).map((option, i) => (
            <Pressable
              key={i}
              onPress={() => !isAnswered && setSelectedOptions(prev => ({ ...prev, [activity.id]: i }))}
              disabled={isAnswered}
              style={[
                styles.optionButton,
                selected === i && styles.optionSelected,
                isAnswered && selected === i && (isCorrect ? styles.optionCorrect : styles.optionWrong),
              ]}
            >
              <Text style={[styles.optionText, selected === i && styles.optionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        {isAnswered && (
          <View style={[styles.feedbackPanel, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={styles.feedbackText}>
              {isCorrect ? '✓ Correct!' : '✗ Not quite'}
            </Text>
            {activity.explanation && (
              <Text style={styles.explanationText}>{activity.explanation}</Text>
            )}
            {!isCorrect && (
              <Pressable
                onPress={() => {
                  setSelectedOptions(prev => ({ ...prev, [activity.id]: null }))
                  setActivityResults(prev => {
                    const next = { ...prev }
                    delete next[activity.id]
                    return next
                  })
                }}
                style={styles.tryAgainBtn}
              >
                <Text style={styles.tryAgainText}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {!isAnswered && selected !== null && (
          <Pressable
            onPress={() => onSubmit(isCorrect)}
            style={[styles.primaryBtn, shadows.mint, { marginTop: 24 }]}
          >
            <Text style={styles.primaryBtnText}>Check answer →</Text>
          </Pressable>
        )}
      </>
    )
  }

  const renderActivityImageId = (activity: Activity, isAnswered: boolean, result: any, onSubmit: (passed: boolean) => void) => {
    const selected = selectedOptions[activity.id]
    const isCorrect = selected === activity.correct_index

    return (
      <>
        <Text style={styles.activityQuestion}>{activity.prompt}</Text>
        <View style={styles.imageGrid2x2}>
          {(activity.options || []).map((desc, i) => (
            <Pressable
              key={i}
              onPress={() => !isAnswered && setSelectedOptions(prev => ({ ...prev, [activity.id]: i }))}
              disabled={isAnswered}
              style={[
                styles.imageOptionCard,
                selected === i && styles.imageOptionSelected,
                isAnswered && selected === i && (isCorrect ? styles.imageOptionCorrect : styles.imageOptionWrong),
              ]}
            >
              <Text style={styles.imageOptionText}>{desc}</Text>
            </Pressable>
          ))}
        </View>

        {isAnswered && (
          <View style={[styles.feedbackPanel, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={styles.feedbackText}>
              {isCorrect ? '✓ Correct!' : '✗ Not quite'}
            </Text>
            {activity.explanation && (
              <Text style={styles.explanationText}>{activity.explanation}</Text>
            )}
            {!isCorrect && (
              <Pressable
                onPress={() => {
                  setSelectedOptions(prev => ({ ...prev, [activity.id]: null }))
                  setActivityResults(prev => {
                    const next = { ...prev }
                    delete next[activity.id]
                    return next
                  })
                }}
                style={styles.tryAgainBtn}
              >
                <Text style={styles.tryAgainText}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {!isAnswered && selected !== null && (
          <Pressable
            onPress={() => onSubmit(isCorrect)}
            style={[styles.primaryBtn, shadows.mint, { marginTop: 24 }]}
          >
            <Text style={styles.primaryBtnText}>Check answer →</Text>
          </Pressable>
        )}
      </>
    )
  }

  const renderActivityFillBlank = (activity: Activity, isAnswered: boolean, result: any, onSubmit: (passed: boolean) => void) => {
    const selected = selectedOptions[activity.id] ?? null
    const shuffledOptions = shuffledOptionsMap[activity.id] ?? []

    const handleSubmit = () => {
      if (selected === null) return
      const selectedOption = shuffledOptions[selected]
      const isCorrect = selectedOption.trim().toLowerCase() === (activity.correct_answer?.trim().toLowerCase() ?? '')
      setActivityResults(prev => ({
        ...prev,
        [activity.id]: { passed: isCorrect, explanation: activity.explanation || '' },
      }))
      onSubmit(isCorrect)
    }

    return (
      <>
        <Text style={styles.activityQuestion}>{activity.prompt || 'Fill in the blank:'}</Text>
        <View style={styles.fillBlankBox}>
          <Text style={styles.fillBlankSentence}>{activity.sentence}</Text>
        </View>

        <View style={styles.optionsList}>
          {shuffledOptions.map((option: string, i: number) => (
            <Pressable
              key={i}
              onPress={() => !isAnswered && setSelectedOptions(prev => ({ ...prev, [activity.id]: i }))}
              disabled={isAnswered}
              style={[
                styles.optionButton,
                selected === i && styles.optionSelected,
                isAnswered && selected === i && (result?.passed ? styles.optionCorrect : styles.optionWrong),
              ]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>

        {isAnswered && (
          <View style={[styles.feedbackPanel, result?.passed ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={styles.feedbackText}>
              {result?.passed ? '✓ Correct!' : '✗ Not quite'}
            </Text>
            {result?.explanation && (
              <Text style={styles.explanationText}>{result.explanation}</Text>
            )}
            {!result?.passed && (
              <Pressable
                onPress={() => {
                  setSelectedOptions(prev => ({ ...prev, [activity.id]: null }))
                  setActivityResults(prev => {
                    const next = { ...prev }
                    delete next[activity.id]
                    return next
                  })
                }}
                style={styles.tryAgainBtn}
              >
                <Text style={styles.tryAgainText}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {!isAnswered && selected !== null && (
          <Pressable
            onPress={handleSubmit}
            style={[styles.primaryBtn, shadows.mint, { marginTop: 24 }]}
          >
            <Text style={styles.primaryBtnText}>Check answer →</Text>
          </Pressable>
        )}
      </>
    )
  }

  const renderActivityMatching = (activity: Activity, isAnswered: boolean, result: any, onSubmit: (passed: boolean) => void) => {
    const state = matchState[activity.id] ?? { leftSelected: null, rightSelected: null, matched: {} }
    const pairs = activity.pairs ?? []

    const handleSubmitMatching = () => {
      // Verify all pairs are matched
      if (Object.keys(state.matched).length !== pairs.length) return

      // Check if all matches are correct
      let allCorrect = true
      for (const pair of pairs) {
        if (state.matched[pair.term] !== pair.definition) {
          allCorrect = false
          break
        }
      }

      setActivityResults(prev => ({
        ...prev,
        [activity.id]: { passed: allCorrect, explanation: allCorrect ? '✓ Perfect match!' : '✗ Some pairs don\'t match. Try again!' },
      }))
      onSubmit(allCorrect)
    }

    return (
      <>
        <Text style={styles.activityQuestion}>{activity.prompt || 'Match the pairs'}</Text>
        <Text style={[styles.bodyTextMuted, { marginBottom: 16 }]}>
          {Object.keys(state.matched).length} of {pairs.length} matched
        </Text>
        <View style={styles.matchingContainer}>
          <View style={styles.matchingColumn}>
            {pairs.map((pair, i) => (
              <Pressable
                key={`left-${i}`}
                style={[
                  styles.matchingTerm,
                  state.leftSelected === pair.term && styles.matchingTermSelected,
                  !!state.matched[pair.term] && styles.matchingTermMatched,
                ]}
                onPress={() => {
                  if (!isAnswered) {
                    setMatchState(prev => ({
                      ...prev,
                      [activity.id]: { ...state, leftSelected: state.leftSelected === pair.term ? null : pair.term },
                    }))
                  }
                }}
              >
                <Text style={styles.matchingTermText}>{pair.term}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.matchingColumn}>
            {pairs.map((pair, i) => (
              <Pressable
                key={`right-${i}`}
                style={[
                  styles.matchingDef,
                  state.rightSelected === pair.definition && styles.matchingDefSelected,
                  Object.values(state.matched).includes(pair.definition) && styles.matchingDefMatched,
                ]}
                onPress={() => {
                  if (!isAnswered && state.leftSelected) {
                    const newMatched = { ...state.matched, [state.leftSelected]: pair.definition }
                    setMatchState(prev => ({
                      ...prev,
                      [activity.id]: { ...state, leftSelected: null, rightSelected: null, matched: newMatched },
                    }))
                  }
                }}
              >
                <Text style={styles.matchingDefText}>{pair.definition}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isAnswered && (
          <View style={[styles.feedbackPanel, result?.passed ? styles.feedbackCorrect : styles.feedbackWrong, { marginTop: 16 }]}>
            <Text style={styles.feedbackText}>
              {result?.passed ? '✓ Correct!' : '✗ Not quite'}
            </Text>
            {result?.explanation && (
              <Text style={styles.explanationText}>{result.explanation}</Text>
            )}
            {!result?.passed && (
              <Pressable
                onPress={() => {
                  setMatchState(prev => ({ ...prev, [activity.id]: { leftSelected: null, rightSelected: null, matched: {} } }))
                  setActivityResults(prev => {
                    const next = { ...prev }
                    delete next[activity.id]
                    return next
                  })
                }}
                style={styles.tryAgainBtn}
              >
                <Text style={styles.tryAgainText}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {Object.keys(state.matched).length === pairs.length && !isAnswered && (
          <Pressable onPress={handleSubmitMatching} style={[styles.primaryBtn, shadows.mint, { marginTop: 24 }]}>
            <Text style={styles.primaryBtnText}>Check matches →</Text>
          </Pressable>
        )}
      </>
    )
  }

  const renderActivitySequence = (activity: Activity, isAnswered: boolean, result: any, onSubmit: (passed: boolean) => void) => {
    const steps = activity.steps ?? []
    const userOrder = userOrders[activity.id] ?? []
    const placedIndices = new Set(userOrder)

    const handleSequenceSubmit = () => {
      const isCorrect = JSON.stringify(userOrder) === JSON.stringify(activity.correct_order ?? [])
      setActivityResults(prev => ({
        ...prev,
        [activity.id]: { passed: isCorrect, explanation: isCorrect ? '✓ Perfect!' : '✗ Some steps are out of order' },
      }))
      onSubmit(isCorrect)
    }

    const handleAddStep = (stepIdx: number) => {
      if (!isAnswered && !placedIndices.has(stepIdx)) {
        setUserOrders(prev => ({
          ...prev,
          [activity.id]: [...(prev[activity.id] ?? []), stepIdx],
        }))
      }
    }

    const handleRemoveStep = (position: number) => {
      if (!isAnswered) {
        setUserOrders(prev => ({
          ...prev,
          [activity.id]: userOrder.filter((_, i) => i !== position),
        }))
      }
    }

    return (
      <>
        <Text style={styles.activityQuestion}>{activity.prompt || 'Put these in order'}</Text>

        {/* Display ordered steps at top */}
        {userOrder.length > 0 && (
          <View style={[styles.orderedSteps, { marginBottom: 20 }]}>
            {userOrder.map((stepIdx, pos) => (
              <Pressable
                key={pos}
                style={styles.orderedStepItem}
                onPress={() => handleRemoveStep(pos)}
              >
                <Text style={styles.orderedStepNumber}>{pos + 1}</Text>
                <Text style={styles.orderedStepText}>{steps[stepIdx]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Display available steps to choose from */}
        <Text style={[styles.bodyTextMuted, { marginBottom: 12 }]}>
          {userOrder.length === 0 ? 'Tap steps to order them' : `${steps.length - userOrder.length} remaining`}
        </Text>
        <View style={styles.stepsList}>
          {steps.map((step, i) => (
            <Pressable
              key={i}
              disabled={placedIndices.has(i) || isAnswered}
              style={[
                styles.stepItem,
                placedIndices.has(i) && { opacity: 0.5 },
              ]}
              onPress={() => handleAddStep(i)}
            >
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </Pressable>
          ))}
        </View>

        {isAnswered && (
          <View style={[styles.feedbackPanel, result?.passed ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={styles.feedbackText}>
              {result?.passed ? '✓ Correct!' : '✗ Not quite'}
            </Text>
            {result?.explanation && (
              <Text style={styles.explanationText}>{result.explanation}</Text>
            )}
            {!result?.passed && (
              <Pressable
                onPress={() => {
                  setUserOrders(prev => ({ ...prev, [activity.id]: [] }))
                  setActivityResults(prev => {
                    const next = { ...prev }
                    delete next[activity.id]
                    return next
                  })
                }}
                style={styles.tryAgainBtn}
              >
                <Text style={styles.tryAgainText}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {userOrder.length === steps.length && !isAnswered && (
          <Pressable onPress={handleSequenceSubmit} style={[styles.primaryBtn, shadows.mint, { marginTop: 24 }]}>
            <Text style={styles.primaryBtnText}>Check order →</Text>
          </Pressable>
        )}
      </>
    )
  }

  // ── Completion card ────────────────────────────────────────────────────────────
  const renderCompletionCard = () => {
    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <Animated.View style={{ transform: [{ scale: companionScale }] }}>
            <Companion size={100} mood="excited" />
          </Animated.View>
        </View>
        <Text style={[styles.sectionHeading, { marginTop: 24, textAlign: 'center' }]}>Lesson complete! 🎉</Text>
        <Text style={[styles.bodyText, { marginTop: 16, textAlign: 'center' }]}>
          +{Math.max(1, completedActivities.size) * 20} XP
        </Text>

        <View style={styles.spacer} />

        <Pressable
          onPress={() => setPhotoModalVisible(true)}
          style={[styles.primaryBtn, shadows.peach, { marginBottom: 12 }]}
        >
          <Text style={styles.primaryBtnText}>Share your cooking? 📷</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.primaryBtn, shadows.mint]}
        >
          <Text style={styles.primaryBtnText}>Back to your path →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Card dispatch ───────────────────────────────────────────────────────────
  const cards = [
    renderCard0,
    renderCard2,
    ...activities.map((_, i) => () => renderActivityCard(i)),
    renderCompletionCard,
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

  // Activity cards
  activityNumber: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  activityQuestion: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 17,
    color: colors.foreground,
    marginBottom: 20,
    lineHeight: 24,
  },

  // Multiple choice options
  optionsList: { gap: 10, marginBottom: 16 },
  optionButton: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.mint,
    backgroundColor: colors.mint + '11',
  },
  optionCorrect: {
    borderColor: colors.mint,
    backgroundColor: colors.mint + '22',
  },
  optionWrong: {
    borderColor: colors.peach,
    backgroundColor: colors.peach + '22',
  },
  optionText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
  },
  optionTextSelected: {
    fontFamily: 'Nunito_600SemiBold',
  },

  // Feedback panel
  feedbackPanel: {
    borderRadius: radius.md,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
  },
  feedbackCorrect: {
    borderLeftColor: colors.mint,
    backgroundColor: colors.mint + '11',
  },
  feedbackWrong: {
    borderLeftColor: colors.peach,
    backgroundColor: colors.peach + '11',
  },
  feedbackText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 8,
  },
  explanationText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  tryAgainBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tryAgainText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.mint,
  },

  // Image grid
  imageGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageOptionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  imageOptionCorrect: {
    borderColor: colors.mint,
    backgroundColor: colors.mint + '22',
  },
  imageOptionWrong: {
    borderColor: colors.peach,
    backgroundColor: colors.peach + '22',
  },

  // Fill blank
  fillBlankBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  textInput: {
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

  // Matching
  matchingContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  matchingColumn: {
    flex: 1,
    gap: 8,
  },
  matchingTerm: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  matchingTermSelected: {
    borderColor: colors.sky,
    backgroundColor: colors.sky + '22',
  },
  matchingTermMatched: {
    borderColor: colors.mint,
    backgroundColor: colors.mint + '22',
  },
  matchingTermText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
  },
  matchingDef: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  matchingDefSelected: {
    borderColor: colors.sky,
    backgroundColor: colors.sky + '22',
  },
  matchingDefMatched: {
    borderColor: colors.mint,
    backgroundColor: colors.mint + '22',
  },
  matchingDefText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
  },

  // Sequence
  stepsList: { gap: 10, marginBottom: 16 },
  stepItem: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  stepNumber: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.mint,
    minWidth: 24,
  },
  stepText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.foreground,
    flex: 1,
  },
  orderedSteps: { gap: 10, marginBottom: 16 },
  orderedStepItem: {
    backgroundColor: colors.mint + '22',
    borderRadius: radius.sm,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.mint,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  orderedStepNumber: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.mint,
    minWidth: 24,
  },
  orderedStepText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    flex: 1,
  },
})
