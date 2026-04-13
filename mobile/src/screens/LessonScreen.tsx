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
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import * as ImagePicker from 'expo-image-picker'
import { File } from 'expo-file-system'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'
const TOTAL_CARDS = 5

// ── Types ─────────────────────────────────────────────────────────────────────

interface Mission {
  id: string
  title: string
  description: string
  why_it_matters: string
  is_required: boolean
  duration_minutes: number
  prompt: string
  reflection_choices: string[]
}

interface LessonParams {
  lessonKey: string
  lessonTitle: string
  chapterTitle: string
  goal: string
  buddyName: string
  experience: number
  completedLessonTitles: string[]
  domain: string
  userId: string | null
  lessonId: string
  onComplete: (lessonId: string) => void
  onFullyComplete?: (lessonKey: string) => void
  initialMissionId?: string  // when set, open directly at mission submission card
}

interface LessonContent {
  card1: { companion_message: string }
  card3: { headline: string; points: string[]; tell_me_more: string }
  missions: Mission[]
}

interface MissionProgress {
  completed_missions: string[]
  is_required_complete: boolean
  is_fully_complete: boolean
}

interface ValidationResult {
  feedback: string
  is_valid: boolean
  xp_earned: number
  mission_completed: boolean
  lesson_now_required_complete: boolean
  lesson_now_fully_complete: boolean
}

// ── Progress Indicator (dots + animated bar) ───────────────────────────────────

function ProgressIndicator({ current, progressAnim }: { current: number; progressAnim: Animated.Value }) {
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  return (
    <View style={piStyles.wrapper}>
      <View style={piStyles.dotsRow}>
        {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
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

  // ── State ──────────────────────────────────────────────────────────────────
  const [cardIndex, setCardIndex] = useState(0)
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missionProgress, setMissionProgress] = useState<MissionProgress | null>(null)
  const [progressFetched, setProgressFetched] = useState(false)
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null)
  const [selectedReflection, setSelectedReflection] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/jpeg')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [tellMeMoreOpen, setTellMeMoreOpen] = useState(false)
  const hasSignaledComplete = useRef(false)
  const hasInitializedCard = useRef(false)

  // ── Swipe nav ──────────────────────────────────────────────────────────────
  // Tracks current swipe permissions — updated every render so PanResponder callbacks
  // always see fresh values without being recreated.
  const canSwipeRef = useRef({ forward: false, back: false, index: 0 })
  const canSwipeForward = cardIndex < 2 && (cardIndex > 0 || (!loading && !!lessonContent))
  const canSwipeBack = cardIndex >= 1 && cardIndex <= 4
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
      // Only claim gesture if clearly horizontal
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

  // Stable refs so PanResponder callbacks can call the latest versions of these
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
          buddy_name: params.buddyName,
          experience: params.experience,
          completed_lesson_titles: params.completedLessonTitles,
          domain: params.domain,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data: LessonContent = await res.json()
      setLessonContent(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch progress ─────────────────────────────────────────────────────────
  const fetchProgress = async () => {
    if (!params.userId) {
      setProgressFetched(true)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/lesson/${params.lessonKey}/${params.userId}/progress`)
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
      await fetchLesson()
      await fetchProgress()
    }
    init()
  }, [])

  // ── Skip to missions list on revisit, or deep-link to a specific mission ────
  useEffect(() => {
    const ready = params.userId ? progressFetched && !!lessonContent : !!lessonContent
    if (!ready || hasInitializedCard.current) return

    hasInitializedCard.current = true

    if (params.initialMissionId) {
      // Deep-link: open directly at mission submission for this mission
      setCurrentMissionId(params.initialMissionId)
      setCardIndex(3)
      progressAnim.setValue(3 / TOTAL_CARDS)
    } else if (missionProgress && missionProgress.completed_missions.length > 0) {
      setCardIndex(2)
      progressAnim.setValue(2 / TOTAL_CARDS)
    }
  }, [lessonContent, progressFetched, missionProgress])

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
      // Slide in from the correct direction
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
    if (validating) {
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
      dot1.setValue(0.3)
      dot2.setValue(0.3)
      dot3.setValue(0.3)
    }
  }, [validating])

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

  // ── Submit mission ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!photoUri || !selectedReflection || !lessonContent || !currentMissionId) return
    const mission = lessonContent.missions.find(m => m.id === currentMissionId)
    if (!mission) return

    setValidating(true)
    advanceCard(4)

    try {
      const base64 = await new File(photoUri).base64()

      const res = await fetch(`${API_BASE}/lesson/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: params.userId,
          lesson_key: params.lessonKey,
          mission_id: currentMissionId,
          photo_base64: base64,
          photo_media_type: photoMimeType,
          reflection_choice: selectedReflection,
          buddy_name: params.buddyName,
          goal: params.goal,
          lesson_title: params.lessonTitle,
          domain: params.domain,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data: ValidationResult = await res.json()
      setValidationResult(data)

      // Update local mission progress
      if (data.mission_completed) {
        setMissionProgress(prev => ({
          completed_missions: [...(prev?.completed_missions ?? []), currentMissionId],
          is_required_complete: data.lesson_now_required_complete || (prev?.is_required_complete ?? false),
          is_fully_complete: prev?.is_fully_complete ?? false,
        }))
      }

      // Signal roadmap to unlock next lesson
      if (data.lesson_now_required_complete && !hasSignaledComplete.current) {
        hasSignaledComplete.current = true
        params.onComplete(params.lessonId)
      }

      // Signal roadmap that all missions (including optional) are done
      if (data.lesson_now_fully_complete) {
        params.onFullyComplete?.(params.lessonKey)
      }

    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setValidating(false)
    }
  }

  // ── Exit lesson ─────────────────────────────────────────────────────────────
  const handleExit = () => {
    // Signal completion if required missions are done but we haven't signaled yet
    if (missionProgress?.is_required_complete && !hasSignaledComplete.current) {
      hasSignaledComplete.current = true
      params.onComplete(params.lessonId)
    }
    navigation.goBack()
  }

  // ── Reset submission state between missions ─────────────────────────────────
  const resetSubmission = () => {
    setPhotoUri(null)
    setPhotoMimeType('image/jpeg')
    setSelectedReflection(null)
    setValidationResult(null)
    setSubmitError(null)
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

  // Card 0: Hook
  const renderCard0 = () => {
    const isReady = !loading && !!lessonContent
    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <Companion size={100} mood={isReady ? 'happy' : 'thinking'} />
        </View>
        <View style={styles.speechBubbleTail} />
        <View style={styles.speechBubble}>
          <Text style={styles.bodyText}>
            {isReady
              ? lessonContent!.card1.companion_message
              : `${params.buddyName} is getting ready...`}
          </Text>
        </View>
        <View style={styles.spacer} />
        <Pressable
          onPress={() => isReady && advanceCard(1)}
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
        <View style={styles.bulletList}>
          {card3.points.map((point, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
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
        <Pressable onPress={() => advanceCard(2)} style={[styles.primaryBtn, shadows.mint]}>
          <Text style={styles.primaryBtnText}>See missions →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // Card 3: Missions List
  const renderCard3 = () => {
    if (!lessonContent) return null
    const { missions } = lessonContent
    const completedIds = new Set(missionProgress?.completed_missions ?? [])
    const requiredMissions = missions.filter(m => m.is_required)
    const optionalMissions = missions.filter(m => !m.is_required)
    const isRequiredComplete = missionProgress?.is_required_complete ?? false

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
              onPress={() => { setCurrentMissionId(mission.id); advanceCard(3) }}
              style={[styles.missionItem, isDone && styles.missionItemDone]}
            >
              <View style={styles.missionItemBody}>
                <View style={styles.missionItemTop}>
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>Required</Text>
                  </View>
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
                  onPress={() => { setCurrentMissionId(mission.id); advanceCard(3) }}
                  style={[styles.missionItem, styles.missionItemOptional, isDone && styles.missionItemDone]}
                >
                  <View style={styles.missionItemBody}>
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
          <Pressable onPress={() => advanceCard(0)} style={styles.reviewBtn}>
            <Text style={styles.reviewBtnText}>Intro</Text>
          </Pressable>
          <Pressable onPress={() => advanceCard(1)} style={styles.reviewBtn}>
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

  // Card 4: Mission Submission
  const renderCard4 = () => {
    if (!lessonContent || !currentMissionId) return null
    const mission = lessonContent.missions.find(m => m.id === currentMissionId)
    if (!mission) return null
    const canSubmit = !!photoUri && !!selectedReflection

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => advanceCard(2)} style={styles.backLink}>
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

        <View style={styles.reflectionGrid}>
          {mission.reflection_choices.map((choice, i) => {
            const isSelected = selectedReflection === choice
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedReflection(choice)}
                style={[styles.reflectionPill, isSelected && styles.reflectionPillSelected]}
              >
                <Text style={[styles.reflectionPillText, isSelected && styles.reflectionPillTextSelected]}>
                  {choice}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.primaryBtn, shadows.mint, !canSubmit && styles.btnDisabled]}
        >
          <Text style={styles.primaryBtnText}>Submit →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // Card 5: Mission Feedback
  const renderCard5 = () => {
    if (submitError) {
      return (
        <View style={styles.feedbackLoading}>
          <Companion size={100} mood="sad" />
          <Text style={styles.loadingText}>Submission failed</Text>
          <Text style={[styles.bodyTextMuted, { textAlign: 'center', marginTop: 8 }]}>{submitError}</Text>
          <Pressable
            onPress={() => { setSubmitError(null); advanceCard(3) }}
            style={[styles.primaryBtn, shadows.mint, { marginTop: 24 }]}
          >
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )
    }

    if (validating || !validationResult) {
      return (
        <View style={styles.feedbackLoading}>
          <Companion size={100} mood="thinking" />
          <Text style={styles.loadingText}>Reviewing your work...</Text>
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.loadingDot, { opacity: dot1 }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot2 }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot3 }]} />
          </View>
        </View>
      )
    }

    const isRequiredComplete = missionProgress?.is_required_complete ?? false

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <Animated.View style={{ transform: [{ scale: companionScale }] }}>
            <Companion size={100} mood={validationResult.mission_completed ? 'excited' : 'happy'} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.messageCard, { opacity: feedbackOpacity }]}>
          <Text style={styles.bodyText}>{validationResult.feedback}</Text>
        </Animated.View>
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
        <View style={styles.spacer} />
        <Pressable
          onPress={() => { resetSubmission(); advanceCard(2) }}
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
  const cards = [renderCard0, renderCard2, renderCard3, renderCard4, renderCard5]

  return (
    <SafeAreaView style={styles.container}>
      <ProgressIndicator current={cardIndex} progressAnim={progressAnim} />
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
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Card content layout
  cardContent: {
    flexGrow: 1,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },

  // Companion positioning
  companionCenter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  companionRow: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  // Soft message card
  messageCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    marginBottom: 24,
  },

  // Typography
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

  // Buttons
  primaryBtn: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
  },
  exitBtnMuted: {
    backgroundColor: colors.card,
  },
  exitBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  exitBtnText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.muted,
  },
  backLink: {
    paddingVertical: 4,
    paddingBottom: 12,
  },
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

  // Card 3 — Missions header
  missionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  missionsHeaderText: {
    flex: 1,
  },
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

  // Card 3 — Mission items
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
  missionItemDone: {
    opacity: 0.6,
  },
  missionItemBody: {
    flex: 1,
  },
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
  missionTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 2,
  },
  missionTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
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

  // Review earlier cards row
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

  // Card 4 — Mission submission
  missionBanner: {
    marginBottom: 8,
  },
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
  photoIcon: {
    fontSize: 32,
  },
  photoPlaceholderText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.muted,
  },
  photoContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
  },
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

  // Reflection
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
  reflectionPillSelected: {
    backgroundColor: colors.mint,
  },
  reflectionPillText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
  },
  reflectionPillTextSelected: {
    color: colors.foreground,
  },

  // Card 5 — Loading
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
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mint,
  },

  // Card 5 — XP badge
  xpRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
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

  // Card 5 — Required complete banner
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

  // ── Card 3: Deep Dive ────────────────────────────────────────────────────────
  card3Headline: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
    lineHeight: 28,
    marginBottom: 12,
  },
  bulletList: {
    gap: 10,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    color: colors.mint,
    fontSize: 18,
    lineHeight: 24,
  },
  bulletText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
    flex: 1,
    lineHeight: 22,
  },

  // ── Card 4: Mission why_it_matters ───────────────────────────────────────────
  missionWhyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },

  // ── Card 0: Speech bubble ────────────────────────────────────────────────────
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

  // ── Card 3: Description accent ───────────────────────────────────────────────
  descriptionCallout: {
    borderLeftWidth: 3,
    borderLeftColor: colors.peach,
    paddingLeft: 14,
    marginBottom: 16,
  },
})
