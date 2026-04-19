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
  Dimensions,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Path, Circle } from 'react-native-svg'
import MonkeyMascot, { MonkeyCelebrate } from '../../components/MonkeyMascot'
import AnnotatedText from '../../components/AnnotatedText'
import { colors, radius } from '../../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'
const { height: SH } = Dimensions.get('window')

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchingPair { term: string; definition: string }

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

// ── Flow lesson types (interleaved content + activities) ──────────────────────

interface FlowHook {
  type: 'hook'
  motivation: string
  learn_points: (string | AnnotatedPoint)[]
}

interface FlowConcept {
  type: 'concept'
  point: string
}

interface FlowActivityItem {
  type: 'activity' | 'capstone'
  id: string
  activity_type: 'multiple_choice' | 'image_id' | 'matching' | 'fill_blank' | 'sequence'
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

type FlowItem = FlowHook | FlowConcept | FlowActivityItem

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

interface ImageItem { url: string; caption?: string }

interface LessonContent {
  lesson_type?: 'technique' | 'recipe' | 'concept' | 'food_science' | 'minigame'
  lesson_key?: string
  // Flow format (technique/food_science/concept/minigame)
  flow?: FlowItem[]
  // Legacy format fields (kept for recipe lessons and backward compat)
  card1?: { motivation: string; learn_points: (string | AnnotatedPoint)[]; images?: ImageItem[] | null }
  card3?: { headline: string; points: (string | AnnotatedPoint)[]; tell_me_more: string; images?: ImageItem[] | null }
  missions?: any[]
  activities?: Activity[]
  sources_cited?: SourceCited[]
  last_reflection_feedback?: string | null
  // Recipe-specific
  ingredient_list?: any[]
  steps?: any[]
}

interface MissionProgress {
  completed_missions: string[]
  is_required_complete: boolean
  is_fully_complete: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toAnnotatedPoint(p: string | AnnotatedPoint): AnnotatedPoint {
  return typeof p === 'string' ? { text: p, source_ids: [] } : p
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HeartIcon({ filled = true }: { filled?: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M 12 21 Q 2 14 2 7 Q 2 3 6 3 Q 9 3 12 7 Q 15 3 18 3 Q 22 3 22 7 Q 22 14 12 21 Z"
        fill={filled ? '#854836' : 'none'}
        stroke="#854836"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function XIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M 6 6 L 18 18 M 18 6 L 6 18" stroke="#854836" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

// ── GM Lesson Header ──────────────────────────────────────────────────────────

function GMLessonHeader({
  progressAnim, totalCards, hearts, onExit,
}: {
  progressAnim: Animated.Value
  totalCards: number
  hearts: number
  onExit: () => void
}) {
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  return (
    <View style={hdrStyles.wrap}>
      <Pressable onPress={onExit} hitSlop={12} style={hdrStyles.exitBtn}>
        <XIcon />
      </Pressable>
      <View style={hdrStyles.barBg}>
        <Animated.View style={[hdrStyles.barFill, { width: barWidth }]}>
          <View style={hdrStyles.barGlow} />
        </Animated.View>
      </View>
      <View style={hdrStyles.hearts}>
        <HeartIcon filled={hearts > 0} />
        <Text style={hdrStyles.heartNum}>{hearts}</Text>
      </View>
    </View>
  )
}

const hdrStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  exitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3.5,
    borderColor: colors.ink,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barBg: {
    flex: 1,
    height: 20,
    backgroundColor: colors.panel,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 100,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 100,
    position: 'relative',
  },
  barGlow: {
    position: 'absolute',
    top: 3,
    left: 8,
    height: 5,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 100,
  },
  hearts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartNum: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.ink,
  },
})

// ── Slide-up Feedback Panel ───────────────────────────────────────────────────

interface FeedbackPanelProps {
  visible: boolean
  isCorrect: boolean
  title: string
  explanation: string
  onContinue: () => void
  onTryAgain?: () => void
}

function FeedbackPanel({ visible, isCorrect, title, explanation, onContinue, onTryAgain }: FeedbackPanelProps) {
  const slideAnim = useRef(new Animated.Value(300)).current

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 300,
      duration: 320,
      useNativeDriver: true,
    }).start()
  }, [visible])

  return (
    <Animated.View
      style={[
        fbStyles.panel,
        isCorrect ? fbStyles.panelCorrect : fbStyles.panelWrong,
        { transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={fbStyles.inner}>
        <MonkeyMascot size={68} mood={isCorrect ? 'happy' : 'sad'} />
        <View style={fbStyles.text}>
          <Text style={fbStyles.title}>{title}</Text>
          {!!explanation && <Text style={fbStyles.explanation}>{explanation}</Text>}
        </View>
      </View>
      <View style={fbStyles.actions}>
        {!isCorrect && !!onTryAgain && (
          <Pressable onPress={onTryAgain} style={[fbStyles.btn, fbStyles.btnGhost]}>
            <Text style={fbStyles.btnText}>Try Again</Text>
          </Pressable>
        )}
        <Pressable onPress={onContinue} style={[fbStyles.btn, fbStyles.btnPrimary, isCorrect && fbStyles.btnPrimaryCorrect]}>
          <Text style={fbStyles.btnText}>Continue →</Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const fbStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 3.5,
    borderColor: colors.ink,
    zIndex: 100,
  },
  panelCorrect: { backgroundColor: colors.accent },
  panelWrong: { backgroundColor: colors.panel },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  text: { flex: 1 },
  title: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    color: colors.ink,
    marginBottom: 2,
  },
  explanation: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
    opacity: 0.8,
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.md,
    borderWidth: 3.5,
    borderColor: colors.ink,
    alignItems: 'center',
  },
  btnGhost: { backgroundColor: 'transparent' },
  btnPrimary: { backgroundColor: colors.panel },
  btnPrimaryCorrect: { backgroundColor: colors.panel },
  btnText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.ink,
  },
})

// ── Bottom CTA (Check button) ─────────────────────────────────────────────────

function BottomCTA({ label, disabled, onPress, hide }: {
  label: string; disabled: boolean; onPress: () => void; hide: boolean
}) {
  const slideAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: hide ? 100 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [hide])

  return (
    <Animated.View style={[ctaStyles.wrap, { transform: [{ translateY: slideAnim }] }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[ctaStyles.btn, disabled && ctaStyles.btnDisabled]}
      >
        <Text style={ctaStyles.btnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}

const ctaStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    backgroundColor: colors.background,
    borderTopWidth: 3.5,
    borderTopColor: colors.ink,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 3.5,
    borderColor: colors.ink,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: colors.ink,
  },
})

// ── Q-Sub label ───────────────────────────────────────────────────────────────

function QSub({ label }: { label: string }) {
  return <Text style={qStyles.sub}>{label.toUpperCase()}</Text>
}

function QPrompt({ text }: { text: string }) {
  return <Text style={qStyles.prompt}>{text}</Text>
}

const qStyles = StyleSheet.create({
  sub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  prompt: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
})

// ── XP Count-up ───────────────────────────────────────────────────────────────

function XPCountUp({ target }: { target: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const start = Date.now()
    const dur = 1000
    const tick = () => {
      const elapsed = Date.now() - start
      const prog = Math.min(elapsed / dur, 1)
      const eased = 1 - Math.pow(1 - prog, 3)
      setVal(Math.round(eased * target))
      if (prog < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return <Text style={compStyles.rewardValue}>{val}</Text>
}

const compStyles = StyleSheet.create({
  rewardValue: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 36,
    color: colors.ink,
  },
})

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function LessonScreen() {
  const route = useRoute<RouteProp<{ params: LessonParams }, 'params'>>()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const params = route.params as LessonParams

  // ── State ──────────────────────────────────────────────────────────────────
  const [cardIndex, setCardIndex] = useState(0)
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null)
  const [sourceMap, setSourceMap] = useState<Record<string, SourceCited>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missionProgress, setMissionProgress] = useState<MissionProgress | null>(null)
  const [progressFetched, setProgressFetched] = useState(false)

  // Activity state
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set())
  const [activityResults, setActivityResults] = useState<Record<string, { passed: boolean; explanation: string }>>({})
  const [hearts, setHearts] = useState(5)
  const [stumbles, setStumbles] = useState(0)
  const [lessonComplete, setLessonComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Feedback panel state
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [feedbackCorrect, setFeedbackCorrect] = useState(false)
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackExplanation, setFeedbackExplanation] = useState('')
  const [pendingActivity, setPendingActivity] = useState<{ activity: Activity; passed: boolean } | null>(null)

  // Per-activity selection state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number | null>>({})
  const [matchState, setMatchState] = useState<Record<string, { leftSelected: string | null; rightSelected: string | null; matched: Record<string, string> }>>({})
  const [userOrders, setUserOrders] = useState<Record<string, number[]>>({})
  // fill_blank: array of placed words per slot (slot index → word | null)
  const [fibSlots, setFibSlots] = useState<Record<string, (string | null)[]>>({})

  // Shuffled options for fill_blank (handles both flow and legacy formats)
  const shuffledOptionsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    const lessonFlow = lessonContent?.flow
    const items: any[] = lessonFlow?.length
      ? lessonFlow.filter((f: any) => f.type === 'activity' || f.type === 'capstone')
      : (lessonContent?.activities ?? [])
    for (const act of items) {
      const actType = act.activity_type ?? act.type
      if (actType === 'fill_blank' && act.options) {
        map[act.id] = [...act.options].sort(() => Math.random() - 0.5)
      }
    }
    return map
  }, [lessonContent?.lesson_key])

  const [tellMeMoreOpen, setTellMeMoreOpen] = useState(false)
  const hasSignaledComplete = useRef(false)
  const hasInitializedCard = useRef(false)

  // ── Dynamic card indices ────────────────────────────────────────────────────
  const isFlow = !!lessonContent?.flow?.length
  const flowItems: FlowItem[] = lessonContent?.flow ?? []
  // Activities = only interactive items (for completion tracking + accuracy)
  const activities: Activity[] = isFlow
    ? (flowItems.filter(f => f.type === 'activity' || f.type === 'capstone') as FlowActivityItem[]).map(f => ({
        id: f.id,
        type: f.activity_type,
        question: f.question,
        prompt: f.prompt,
        options: f.options,
        correct_index: f.correct_index,
        explanation: f.explanation,
        pairs: f.pairs,
        sentence: f.sentence,
        correct_answer: f.correct_answer,
        steps: f.steps,
        correct_order: f.correct_order,
      }))
    : (lessonContent?.activities ?? [])
  const activityCount = activities.length
  const TOTAL_CARDS = isFlow ? flowItems.length + 1 : 2 + activityCount + 1
  const CARD_HOOK = 0
  const CARD_DEEP_DIVE = 1
  const CARD_FIRST_ACTIVITY = 2
  const CARD_COMPLETION = isFlow ? flowItems.length : 2 + activityCount

  // ── Swipe nav ──────────────────────────────────────────────────────────────
  const canSwipeRef = useRef({ forward: false, back: false, index: 0 })
  // Flow: allow forward swipe on non-activity cards (hook + concept)
  // Legacy: allow swipe only on cards 0-1
  const isFlowActivityCard = isFlow && cardIndex < CARD_COMPLETION &&
    (flowItems[cardIndex]?.type === 'activity' || flowItems[cardIndex]?.type === 'capstone')
  const canSwipeForward = isFlow
    ? (cardIndex < CARD_COMPLETION && !isFlowActivityCard && (!loading && !!lessonContent))
    : (cardIndex < 2 && (cardIndex > 0 || (!loading && !!lessonContent)))
  const canSwipeBack = cardIndex >= 1 && cardIndex <= (TOTAL_CARDS - 1)
  canSwipeRef.current = { forward: canSwipeForward, back: canSwipeBack, index: cardIndex }

  // ── Animations ─────────────────────────────────────────────────────────────
  const cardOpacity = useRef(new Animated.Value(1)).current
  const cardTranslateX = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const chevronRotate = useRef(new Animated.Value(0)).current
  const expandAnim = useRef(new Animated.Value(0)).current

  // ── Swipe responder ────────────────────────────────────────────────────────
  const snapBack = () =>
    Animated.spring(cardTranslateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start()

  const advanceCardRef = useRef<(n: number) => void>(() => {})

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
          advanceCardRef.current(index - 1)
        } else {
          snapBack()
        }
      },
      onPanResponderTerminate: () => snapBack(),
    })
  ).current

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
      if (data.sources_cited?.length) {
        const map: Record<string, SourceCited> = {}
        for (const s of data.sources_cited) map[s.source_id] = s
        setSourceMap(map)
      }
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const fetchProgress = async (canonicalKey?: string) => {
    if (!params.userId) { setProgressFetched(true); return }
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

  useEffect(() => {
    const ready = params.userId ? progressFetched && !!lessonContent : !!lessonContent
    if (!ready || hasInitializedCard.current) return
    hasInitializedCard.current = true
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
      setCompletedActivities(prev => new Set([...prev, activity.id]))
      if (completedActivities.size + 1 === activities.length) {
        setLessonComplete(true)
        if (!hasSignaledComplete.current) {
          hasSignaledComplete.current = true
          params.onComplete(params.lessonId)
        }
      }
    } catch { /* non-blocking */ } finally {
      setSubmitting(false)
    }
  }

  // ── Show feedback ─────────────────────────────────────────────────────────
  const showFeedback = async (activity: Activity, passed: boolean, explanation: string) => {
    if (!passed) {
      setHearts(prev => Math.max(0, prev - 1))
      setStumbles(prev => prev + 1)
    }
    setFeedbackCorrect(passed)
    setFeedbackTitle(passed ? 'Sizzling!' : 'Not quite.')
    setFeedbackExplanation(explanation)
    setFeedbackVisible(true)
    setPendingActivity({ activity, passed })
    // Fire API in background
    markActivityComplete(activity, passed)
  }

  const handleFeedbackContinue = () => {
    setFeedbackVisible(false)
    if (!pendingActivity) return

    const { activity, passed } = pendingActivity
    setPendingActivity(null)

    if (passed) {
      if (isFlow) {
        // Flow: always advance by 1 (next flow item or completion)
        const next = cardIndex + 1
        setTimeout(() => advanceCard(next <= CARD_COMPLETION ? next : CARD_COMPLETION), 350)
      } else {
        // Legacy: find next activity card
        const currentActivityIndex = activities.findIndex(a => a.id === activity.id)
        setTimeout(() => {
          if (currentActivityIndex + 1 < activities.length) {
            advanceCard(CARD_FIRST_ACTIVITY + currentActivityIndex + 1)
          } else {
            advanceCard(CARD_COMPLETION)
          }
        }, 350)
      }
    }
    // Wrong: stay on same card (user retries)
  }

  const handleFeedbackTryAgain = () => {
    if (!pendingActivity) return
    const { activity } = pendingActivity
    // Reset selection for this activity
    setSelectedOptions(prev => ({ ...prev, [activity.id]: null }))
    setFibSlots(prev => ({ ...prev, [activity.id]: [] }))
    setMatchState(prev => ({ ...prev, [activity.id]: { leftSelected: null, rightSelected: null, matched: {} } }))
    setUserOrders(prev => ({ ...prev, [activity.id]: [] }))
    setPendingActivity(null)
    setFeedbackVisible(false)
  }

  // ── Exit lesson ─────────────────────────────────────────────────────────────
  const handleExit = () => {
    if (missionProgress?.is_required_complete && !hasSignaledComplete.current) {
      hasSignaledComplete.current = true
      params.onComplete(params.lessonId)
    }
    navigation.goBack()
  }

  const chevronDeg = chevronRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const expandMaxHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] })

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorCard}>
          <MonkeyMascot size={80} mood="sad" />
          <Text style={styles.errorTitle}>Couldn't load lesson</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <Pressable onPress={fetchLesson} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // ── Image gallery helper ───────────────────────────────────────────────────
  const renderImageGallery = (images: ImageItem[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 16 }}
      contentContainerStyle={{ gap: 12, paddingRight: 8 }}
    >
      {images.map((img, i) => (
        <View key={i} style={styles.galleryItem}>
          <Image source={{ uri: img.url }} style={styles.galleryImage} resizeMode="cover" />
          {!!img.caption && <Text style={styles.galleryCaption}>{img.caption}</Text>}
        </View>
      ))}
    </ScrollView>
  )

  // ── Flow card dispatcher ───────────────────────────────────────────────────
  const renderFlowCard = (item: FlowItem, index: number): React.ReactNode => {
    switch (item.type) {
      case 'hook':    return renderFlowHook(item as FlowHook)
      case 'concept': return renderFlowConcept(item as FlowConcept, index)
      case 'activity':
      case 'capstone': return renderFlowActivity(item as FlowActivityItem)
      default: return null
    }
  }

  // ── Flow: Hook card ────────────────────────────────────────────────────────
  const renderFlowHook = (item: FlowHook) => (
    <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
      <View style={styles.companionCenter}>
        <MonkeyMascot size={100} mood="happy" />
      </View>
      <View style={styles.speechBubble}>
        <Text style={styles.hookSectionLabel}>Motivation</Text>
        <Text style={styles.hookMotivation}>{item.motivation}</Text>
        <View style={styles.hookDivider} />
        <Text style={styles.hookSectionLabel}>In this lesson you'll learn how to…</Text>
        {item.learn_points.map((point, i) => {
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
      </View>
      <View style={styles.spacer} />
      <Pressable onPress={() => advanceCard(cardIndex + 1)} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Let's go →</Text>
      </Pressable>
    </ScrollView>
  )

  // ── Flow: Concept card ─────────────────────────────────────────────────────
  const renderFlowConcept = (item: FlowConcept, index: number) => {
    // Count how many concept cards came before this one
    const conceptNumber = flowItems.slice(0, index).filter(f => f.type === 'concept').length + 1
    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.conceptBadgeRow}>
          <View style={styles.conceptBadge}>
            <Text style={styles.conceptBadgeText}>KEY CONCEPT {conceptNumber}</Text>
          </View>
        </View>
        <View style={styles.conceptCard}>
          <Text style={styles.conceptPoint}>{item.point}</Text>
        </View>
        <View style={styles.spacer} />
        <Pressable onPress={() => advanceCard(cardIndex + 1)} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Got it →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Flow: Activity/Capstone card ───────────────────────────────────────────
  const renderFlowActivity = (item: FlowActivityItem) => {
    // Bridge to Activity shape so existing render functions work unchanged
    const asActivity: Activity = {
      id: item.id,
      type: item.activity_type,
      question: item.question,
      prompt: item.prompt,
      options: item.options,
      correct_index: item.correct_index,
      explanation: item.explanation,
      pairs: item.pairs,
      sentence: item.sentence,
      correct_answer: item.correct_answer,
      steps: item.steps,
      correct_order: item.correct_order,
    }
    const isAnswered = feedbackVisible && pendingActivity?.activity.id === item.id
    return (
      <ScrollView
        contentContainerStyle={[styles.cardContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {item.type === 'capstone' && (
          <View style={styles.capstoneBadgeRow}>
            <View style={styles.capstoneBadge}>
              <Text style={styles.capstoneBadgeText}>FINAL CHALLENGE</Text>
            </View>
          </View>
        )}
        {item.activity_type === 'multiple_choice' && renderMultipleChoice(asActivity, isAnswered)}
        {item.activity_type === 'image_id' && renderImageId(asActivity, isAnswered)}
        {item.activity_type === 'fill_blank' && renderFillBlank(asActivity, isAnswered)}
        {item.activity_type === 'matching' && renderMatching(asActivity, isAnswered)}
        {item.activity_type === 'sequence' && renderSequence(asActivity, isAnswered)}
      </ScrollView>
    )
  }

  // ── Card 0: Hook ───────────────────────────────────────────────────────────
  const renderCard0 = () => {
    const isReady = !loading && !!lessonContent
    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <MonkeyMascot size={100} mood={isReady ? 'happy' : 'idle'} />
        </View>
        <View style={styles.speechBubble}>
          {isReady ? (
            <>
              <Text style={styles.hookSectionLabel}>Motivation</Text>
              <Text style={styles.hookMotivation}>{lessonContent!.card1?.motivation}</Text>
              <View style={styles.hookDivider} />
              <Text style={styles.hookSectionLabel}>In this lesson you'll learn how to…</Text>
              {(lessonContent!.card1?.learn_points ?? []).map((point, i) => {
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
              <Text style={styles.hookSectionLabel}>Getting ready...</Text>
              <Text style={styles.hookMotivation}>Preparing your lesson</Text>
            </>
          )}
        </View>
        {isReady && lessonContent?.card1.images?.length ? renderImageGallery(lessonContent.card1.images) : null}
        <View style={styles.spacer} />
        <Pressable
          onPress={() => isReady && advanceCard(CARD_DEEP_DIVE)}
          style={[styles.primaryBtn, !isReady && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Let's go →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Card 1: Deep Dive ──────────────────────────────────────────────────────
  const renderCard1 = () => {
    if (!lessonContent?.card3) return null
    const { card3 } = lessonContent
    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionRow}>
          <MonkeyMascot size={60} mood="idle" />
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
          <Animated.Text style={[styles.chevron, { transform: [{ rotate: chevronDeg }] }]}>▾</Animated.Text>
          <Text style={styles.tellMeMoreLabel}>Tell me more</Text>
        </Pressable>
        <Animated.View style={{ maxHeight: expandMaxHeight, overflow: 'hidden' }}>
          <Text style={styles.bodyTextMuted}>{card3.tell_me_more}</Text>
        </Animated.View>
        <View style={styles.spacer} />
        <Pressable onPress={() => advanceCard(CARD_FIRST_ACTIVITY)} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Ready to practice? →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Activity card shell ────────────────────────────────────────────────────
  const renderActivityCard = (activityIndex: number) => {
    const activity = activities[activityIndex]
    if (!activity) return null
    const isAnswered = feedbackVisible && pendingActivity?.activity.id === activity.id

    return (
      <ScrollView
        contentContainerStyle={[styles.cardContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {activity.type === 'multiple_choice' && renderMultipleChoice(activity, isAnswered)}
        {activity.type === 'image_id' && renderImageId(activity, isAnswered)}
        {activity.type === 'fill_blank' && renderFillBlank(activity, isAnswered)}
        {activity.type === 'matching' && renderMatching(activity, isAnswered)}
        {activity.type === 'sequence' && renderSequence(activity, isAnswered)}
      </ScrollView>
    )
  }

  // ── Helper: determine if current activity can check ───────────────────────
  const getActivityReadiness = (activity: Activity): boolean => {
    if (activity.type === 'multiple_choice' || activity.type === 'image_id') {
      return selectedOptions[activity.id] !== null && selectedOptions[activity.id] !== undefined
    }
    if (activity.type === 'fill_blank') {
      const slots = fibSlots[activity.id] ?? []
      return slots.some(s => s !== null)
    }
    if (activity.type === 'matching') {
      const state = matchState[activity.id] ?? { leftSelected: null, rightSelected: null, matched: {} }
      return Object.keys(state.matched).length === (activity.pairs?.length ?? 0)
    }
    if (activity.type === 'sequence') {
      return (userOrders[activity.id] ?? []).length === (activity.steps?.length ?? 0)
    }
    return false
  }

  // ── Multiple Choice ────────────────────────────────────────────────────────
  const renderMultipleChoice = (activity: Activity, isAnswered: boolean) => {
    const selected = selectedOptions[activity.id] ?? null
    return (
      <>
        <QSub label="Choose the best answer" />
        <QPrompt text={activity.question || activity.prompt || ''} />
        <View style={styles.mcList}>
          {(activity.options || []).map((option, i) => {
            const isSelected = selected === i
            return (
              <Pressable
                key={i}
                onPress={() => !isAnswered && setSelectedOptions(prev => ({ ...prev, [activity.id]: i }))}
                disabled={isAnswered}
                style={[styles.mcOption, isSelected && styles.mcOptionSelected]}
              >
                <View style={[styles.mcRadio, isSelected && styles.mcRadioSelected]}>
                  {isSelected && <View style={styles.mcRadioDot} />}
                </View>
                <Text style={[styles.mcOptionText, isSelected && styles.mcOptionTextSelected]}>{option}</Text>
                <View style={styles.kbdBadge}>
                  <Text style={styles.kbdText}>{i + 1}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </>
    )
  }

  // ── Image ID ───────────────────────────────────────────────────────────────
  const renderImageId = (activity: Activity, isAnswered: boolean) => {
    const selected = selectedOptions[activity.id] ?? null
    return (
      <>
        <QSub label="Select the correct image" />
        <QPrompt text={activity.prompt || activity.question || ''} />
        <View style={styles.imgGrid}>
          {(activity.options || []).map((desc, i) => {
            const isSelected = selected === i
            return (
              <Pressable
                key={i}
                onPress={() => !isAnswered && setSelectedOptions(prev => ({ ...prev, [activity.id]: i }))}
                disabled={isAnswered}
                style={[styles.imgCard, isSelected && styles.imgCardSelected]}
              >
                <View style={styles.imgCardIllus}>
                  <Text style={styles.imgCardIllusText}>{desc.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={[styles.imgCardCaption, isSelected && styles.imgCardCaptionSelected]}>
                  <Text style={styles.imgCardCaptionText} numberOfLines={2}>{desc}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </>
    )
  }

  // ── Fill in the Blank ──────────────────────────────────────────────────────
  const renderFillBlank = (activity: Activity, isAnswered: boolean) => {
    const shuffled = shuffledOptionsMap[activity.id] ?? []
    const slots = fibSlots[activity.id] ?? []

    // Parse sentence into parts + blank markers
    const sentence = activity.sentence || ''
    const parts = sentence.split('___')

    const placeWord = (word: string) => {
      if (isAnswered) return
      const slotIdx = slots.findIndex(s => s === null) === -1
        ? slots.length < parts.length - 1 ? slots.length : -1
        : slots.findIndex(s => s === null)
      if (slotIdx === -1) return
      const newSlots = [...slots]
      if (newSlots[slotIdx] !== undefined) {
        newSlots[slotIdx] = word
      } else {
        while (newSlots.length <= slotIdx) newSlots.push(null)
        newSlots[slotIdx] = word
      }
      setFibSlots(prev => ({ ...prev, [activity.id]: newSlots }))
    }

    const removeSlot = (idx: number) => {
      if (isAnswered) return
      const newSlots = [...slots]
      newSlots[idx] = null
      setFibSlots(prev => ({ ...prev, [activity.id]: newSlots }))
    }

    return (
      <>
        <QSub label="Fill in the blanks" />
        <QPrompt text={activity.prompt || 'Complete the sentence'} />

        {/* Sentence with inline slots */}
        <View style={styles.fibSentenceWrap}>
          <Text style={styles.fibSentence}>
            {parts.map((part, i) => (
              <React.Fragment key={i}>
                <Text style={styles.fibSentenceText}>{part}</Text>
                {i < parts.length - 1 && (
                  <Pressable onPress={() => removeSlot(i)} style={styles.fibSlot}>
                    <Text style={[styles.fibSlotText, slots[i] && styles.fibSlotFilled]}>
                      {slots[i] || '          '}
                    </Text>
                  </Pressable>
                )}
              </React.Fragment>
            ))}
          </Text>
        </View>

        {/* Word bank */}
        <View style={styles.fibBank}>
          {shuffled.map((word, i) => {
            const isUsed = slots.includes(word)
            return (
              <Pressable
                key={i}
                onPress={() => !isUsed && placeWord(word)}
                disabled={isUsed || isAnswered}
                style={[styles.fibChip, isUsed && styles.fibChipUsed]}
              >
                <Text style={[styles.fibChipText, isUsed && styles.fibChipTextUsed]}>{word}</Text>
              </Pressable>
            )
          })}
        </View>
      </>
    )
  }

  // ── Matching ───────────────────────────────────────────────────────────────
  const renderMatching = (activity: Activity, isAnswered: boolean) => {
    const state = matchState[activity.id] ?? { leftSelected: null, rightSelected: null, matched: {} }
    const pairs = activity.pairs ?? []
    return (
      <>
        <QSub label="Match the pairs" />
        <QPrompt text={activity.prompt || 'Match each term with its definition'} />
        <Text style={styles.matchCount}>{Object.keys(state.matched).length} of {pairs.length} matched</Text>
        <View style={styles.matchingContainer}>
          <View style={styles.matchingCol}>
            {pairs.map((pair, i) => (
              <Pressable
                key={i}
                style={[
                  styles.matchCard,
                  state.leftSelected === pair.term && styles.matchCardSelected,
                  !!state.matched[pair.term] && styles.matchCardMatched,
                ]}
                onPress={() => {
                  if (!isAnswered)
                    setMatchState(prev => ({
                      ...prev,
                      [activity.id]: { ...state, leftSelected: state.leftSelected === pair.term ? null : pair.term },
                    }))
                }}
              >
                <Text style={styles.matchCardText}>{pair.term}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.matchingCol}>
            {pairs.map((pair, i) => (
              <Pressable
                key={i}
                style={[
                  styles.matchCard,
                  state.rightSelected === pair.definition && styles.matchCardSelected,
                  Object.values(state.matched).includes(pair.definition) && styles.matchCardMatched,
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
                <Text style={styles.matchCardText}>{pair.definition}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </>
    )
  }

  // ── Sequence ───────────────────────────────────────────────────────────────
  const renderSequence = (activity: Activity, isAnswered: boolean) => {
    const steps = activity.steps ?? []
    const userOrder = userOrders[activity.id] ?? []
    const placedIndices = new Set(userOrder)

    return (
      <>
        <QSub label="Put in order" />
        <QPrompt text={activity.prompt || 'Put these in the correct order'} />

        {userOrder.length > 0 && (
          <View style={styles.seqPlaced}>
            {userOrder.map((stepIdx, pos) => (
              <Pressable
                key={pos}
                style={styles.seqPlacedItem}
                onPress={() => !isAnswered && setUserOrders(prev => ({
                  ...prev,
                  [activity.id]: userOrder.filter((_, i) => i !== pos),
                }))}
              >
                <View style={styles.seqNum}>
                  <Text style={styles.seqNumText}>{pos + 1}</Text>
                </View>
                <Text style={styles.seqItemText}>{steps[stepIdx]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.seqHint}>
          {userOrder.length === 0 ? 'Tap to add steps in order' : `${steps.length - userOrder.length} remaining`}
        </Text>
        <View style={styles.seqBank}>
          {steps.map((step, i) => (
            <Pressable
              key={i}
              disabled={placedIndices.has(i) || isAnswered}
              style={[styles.seqBankItem, placedIndices.has(i) && styles.seqBankItemUsed]}
              onPress={() => !isAnswered && !placedIndices.has(i) && setUserOrders(prev => ({
                ...prev,
                [activity.id]: [...(prev[activity.id] ?? []), i],
              }))}
            >
              <Text style={[styles.seqItemText, placedIndices.has(i) && { opacity: 0.3 }]}>{step}</Text>
            </Pressable>
          ))}
        </View>
      </>
    )
  }

  // ── Completion card ────────────────────────────────────────────────────────
  const renderCompletionCard = () => {
    const xpEarned = Math.max(1, completedActivities.size) * 10
    const accuracy = activities.length > 0
      ? Math.round(((activities.length - stumbles) / activities.length) * 100)
      : 100
    return (
      <ScrollView contentContainerStyle={styles.completionContent} showsVerticalScrollIndicator={false}>
        <MonkeyCelebrate size={160} />
        <Text style={styles.completionTitle}>Lesson complete!</Text>
        <Text style={styles.completionSub}>
          {stumbles === 0
            ? 'Perfect score!'
            : `${stumbles} stumble${stumbles > 1 ? 's' : ''}. You got them.`}
        </Text>

        <View style={styles.rewardRow}>
          <View style={[styles.rewardCard, styles.rewardCardAccent]}>
            <Text style={styles.rewardLabel}>XP EARNED</Text>
            <XPCountUp target={xpEarned} />
          </View>
          <View style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>ACCURACY</Text>
            <Text style={compStyles.rewardValue}>{accuracy}%</Text>
          </View>
        </View>

        <Pressable onPress={() => navigation.goBack()} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Back to Roadmap</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Card dispatch ───────────────────────────────────────────────────────────
  const cards = isFlow
    ? [
        ...flowItems.map((item, i) => () => renderFlowCard(item, i)),
        renderCompletionCard,
      ]
    : [
        renderCard0,
        renderCard1,
        ...activities.map((_, i) => () => renderActivityCard(i)),
        renderCompletionCard,
      ]

  // ── Current activity (for CTA) ─────────────────────────────────────────────
  const isActivityCard = isFlow ? isFlowActivityCard : (cardIndex >= CARD_FIRST_ACTIVITY && cardIndex < CARD_COMPLETION)
  const currentActivity: Activity | null = (() => {
    if (!isActivityCard) return null
    if (isFlow) {
      const flowItem = flowItems[cardIndex] as FlowActivityItem
      return flowItem ? {
        id: flowItem.id,
        type: flowItem.activity_type,
        question: flowItem.question,
        prompt: flowItem.prompt,
        options: flowItem.options,
        correct_index: flowItem.correct_index,
        explanation: flowItem.explanation,
        pairs: flowItem.pairs,
        sentence: flowItem.sentence,
        correct_answer: flowItem.correct_answer,
        steps: flowItem.steps,
        correct_order: flowItem.correct_order,
      } : null
    }
    return activities[cardIndex - CARD_FIRST_ACTIVITY] ?? null
  })()

  // Check button logic
  const handleCheck = () => {
    if (!currentActivity) return
    const passed = (() => {
      if (currentActivity.type === 'multiple_choice' || currentActivity.type === 'image_id') {
        return selectedOptions[currentActivity.id] === currentActivity.correct_index
      }
      if (currentActivity.type === 'fill_blank') {
        const slots = fibSlots[currentActivity.id] ?? []
        const placed = slots.filter(Boolean).join(' ').trim().toLowerCase()
        return placed === (currentActivity.correct_answer?.trim().toLowerCase() ?? '')
      }
      if (currentActivity.type === 'matching') {
        const state = matchState[currentActivity.id]
        if (!state) return false
        return (currentActivity.pairs ?? []).every(p => state.matched[p.term] === p.definition)
      }
      if (currentActivity.type === 'sequence') {
        return JSON.stringify(userOrders[currentActivity.id] ?? []) ===
          JSON.stringify(currentActivity.correct_order ?? [])
      }
      return false
    })()

    showFeedback(currentActivity, passed, currentActivity.explanation || (passed ? 'Great work!' : `Answer: ${currentActivity.correct_answer || 'See above'}`))
  }

  const checkReady = currentActivity ? getActivityReadiness(currentActivity) : false
  const showCTA = isActivityCard && !feedbackVisible
  const showCompletionCTA = cardIndex === CARD_COMPLETION

  return (
    <SafeAreaView style={styles.container}>
      <GMLessonHeader
        progressAnim={progressAnim}
        totalCards={TOTAL_CARDS}
        hearts={hearts}
        onExit={handleExit}
      />

      <Animated.View
        style={[
          styles.cardWrapper,
          { opacity: cardOpacity, transform: [{ translateX: cardTranslateX }] },
        ]}
        {...swipeResponder.panHandlers}
      >
        {cards[cardIndex]?.()}
      </Animated.View>

      {/* Bottom CTA (Check button) for activity cards */}
      {showCTA && (
        <BottomCTA
          label="Check"
          disabled={!checkReady || submitting}
          onPress={handleCheck}
          hide={feedbackVisible}
        />
      )}

      {/* Slide-up feedback panel */}
      {isActivityCard && (
        <FeedbackPanel
          visible={feedbackVisible}
          isCorrect={feedbackCorrect}
          title={feedbackTitle}
          explanation={feedbackExplanation}
          onContinue={handleFeedbackContinue}
          onTryAgain={!feedbackCorrect ? handleFeedbackTryAgain : undefined}
        />
      )}
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  cardWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  cardContent: { flexGrow: 1, paddingBottom: 32 },
  spacer: { flex: 1, minHeight: 24 },

  // Flow: Concept card
  conceptBadgeRow: { alignItems: 'flex-start', marginBottom: 16 },
  conceptBadge: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  conceptBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  conceptCard: {
    backgroundColor: colors.panel,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  conceptPoint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: colors.ink,
    lineHeight: 32,
  },

  // Flow: Capstone badge
  capstoneBadgeRow: { alignItems: 'flex-start', marginBottom: 12 },
  capstoneBadge: {
    backgroundColor: '#854836',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  capstoneBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Hook card
  companionCenter: { alignItems: 'center', marginBottom: 20 },
  companionRow: { alignItems: 'flex-start', marginBottom: 16 },
  speechBubble: {
    backgroundColor: colors.panel,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: 20,
    marginBottom: 20,
  },
  hookSectionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  hookMotivation: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: colors.ink,
    lineHeight: 26,
    marginBottom: 16,
  },
  hookDivider: { height: 1.5, backgroundColor: colors.border, opacity: 0.4, marginBottom: 16 },
  hookBulletText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  hookBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 7,
  },

  // Deep dive card
  card3Headline: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  bulletList: { marginBottom: 8 },
  bulletText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  tellMeMoreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  chevron: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.inkSoft, lineHeight: 22 },
  tellMeMoreLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.inkSoft },
  bodyTextMuted: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // Multiple choice
  mcList: { gap: 12, marginTop: 4 },
  mcOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.panel,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
  },
  mcOptionSelected: { backgroundColor: colors.accent },
  mcRadio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mcRadioSelected: { backgroundColor: colors.ink },
  mcRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  mcOptionText: {
    flex: 1,
    fontFamily: 'Fredoka_400Regular',
    fontSize: 18,
    color: colors.ink,
  },
  mcOptionTextSelected: { fontFamily: 'Fredoka_600SemiBold' },
  kbdBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 10,
    backgroundColor: colors.background,
    flexShrink: 0,
  },
  kbdText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: colors.inkSoft,
  },

  // Image ID
  imgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 4,
  },
  imgCard: {
    width: '47%',
    aspectRatio: 1 / 1.08,
    backgroundColor: colors.panel,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  imgCardSelected: { backgroundColor: colors.accent, transform: [{ translateY: -3 }] },
  imgCardIllus: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'transparent',
  },
  imgCardIllusText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 36,
    color: colors.ink,
    opacity: 0.4,
  },
  imgCardCaption: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderTopWidth: 3.5,
    borderTopColor: colors.ink,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  imgCardCaptionSelected: { backgroundColor: colors.accent },
  imgCardCaptionText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },

  // Fill in blank
  fibSentenceWrap: { marginTop: 4, marginBottom: 20 },
  fibSentence: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    color: colors.ink,
    lineHeight: 44,
  },
  fibSentenceText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    color: colors.ink,
  },
  fibSlot: {
    borderBottomWidth: 3.5,
    borderBottomColor: colors.ink,
    minWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  fibSlotText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: colors.inkSoft,
  },
  fibSlotFilled: {
    color: colors.ink,
    backgroundColor: colors.accent,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  fibBank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    padding: 18,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.inkSoft,
    borderRadius: radius.md,
    minHeight: 80,
  },
  fibChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.panel,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 14,
  },
  fibChipUsed: {
    opacity: 0.25,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
  },
  fibChipText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.ink,
  },
  fibChipTextUsed: { color: 'transparent' },

  // Matching
  matchCount: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: 16,
  },
  matchingContainer: { flexDirection: 'row', gap: 12 },
  matchingCol: { flex: 1, gap: 10 },
  matchCard: {
    padding: 14,
    backgroundColor: colors.panel,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  matchCardSelected: { backgroundColor: colors.accent },
  matchCardMatched: { backgroundColor: colors.accent, opacity: 0.7 },
  matchCardText: {
    fontFamily: 'Fredoka_400Regular',
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },

  // Sequence
  seqPlaced: { gap: 8, marginBottom: 16 },
  seqPlacedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.accent,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderRadius: radius.sm,
  },
  seqNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqNumText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: colors.panel,
  },
  seqHint: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: 12,
  },
  seqBank: { gap: 10 },
  seqBankItem: {
    padding: 14,
    backgroundColor: colors.panel,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderRadius: radius.sm,
  },
  seqBankItemUsed: { opacity: 0.3, borderStyle: 'dashed' },
  seqItemText: {
    fontFamily: 'Fredoka_400Regular',
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
  },

  // Completion
  completionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  completionTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 40,
    color: colors.ink,
    letterSpacing: -1,
    marginTop: 20,
    marginBottom: 6,
    textAlign: 'center',
  },
  completionSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.inkSoft,
    marginBottom: 32,
    textAlign: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 40,
    width: '100%',
  },
  rewardCard: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.panel,
    borderWidth: 3.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 6,
  },
  rewardCardAccent: { backgroundColor: colors.accent },
  rewardLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.ink,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 3.5,
    borderColor: colors.ink,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  btnDisabled: { opacity: 0.35 },
  primaryBtnText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: colors.ink,
  },

  // Error state
  errorCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
  },
  errorMsg: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },

  // Image gallery
  galleryItem: { borderRadius: radius.sm, overflow: 'hidden', maxWidth: 220 },
  galleryImage: { width: 220, height: 140 },
  galleryCaption: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.inkSoft,
    paddingTop: 6,
    textAlign: 'center',
  },
})
