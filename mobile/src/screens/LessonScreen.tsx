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
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { WebView } from 'react-native-webview'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'
const TOTAL_CARDS = 6

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonParams {
  lessonTitle: string
  lessonType: 'lesson' | 'practice' | 'milestone'
  chapterTitle: string
  goal: string
  buddyName: string
  experience: number
  completedLessonTitles: string[]
  domain: string
  userId: string | null
  lessonId: string
  onComplete: (lessonId: string) => void
}

interface LessonContent {
  card1: { companion_message: string }
  card2: { companion_tip: string; video_key: string }
  card3: { explanation: string; tell_me_more: string }
  card4: { description: string; duration_minutes: number; focus_point: string }
  card5: { prompt: string; reflection_choices: string[] }
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

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
  const [selectedReflection, setSelectedReflection] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ feedback: string; xp_earned: number } | null>(null)
  const [missionActive, setMissionActive] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [tellMeMoreOpen, setTellMeMoreOpen] = useState(false)
  const [webViewLoaded, setWebViewLoaded] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
          lesson_title: params.lessonTitle,
          lesson_type: params.lessonType,
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

  useEffect(() => { fetchLesson() }, [])

  // ── Mission timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (missionActive) {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [missionActive])

  // ── Card transition ─────────────────────────────────────────────────────────
  const advanceCard = (nextIndex: number) => {
    Animated.timing(cardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCardIndex(nextIndex)
      Animated.timing(progressAnim, {
        toValue: nextIndex / TOTAL_CARDS,
        duration: 300,
        useNativeDriver: false,
      }).start()
      cardTranslateX.setValue(20)
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(cardTranslateX, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start()
    })
  }

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

  // ── Card 6 reveal animations ────────────────────────────────────────────────
  useEffect(() => {
    if (!validationResult) return
    // Companion: scale down then spring back up (thinking → excited transition)
    Animated.sequence([
      Animated.timing(companionScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(companionScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start()
    // Feedback card: fade in after 300ms
    feedbackOpacity.setValue(0)
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start()
    // XP badge: spring from 0 with bounce
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
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
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
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
    }
  }

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose how to add your photo', [
      { text: 'Take a Photo', onPress: () => pickPhoto('camera') },
      { text: 'Choose from Gallery', onPress: () => pickPhoto('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!photoUri || !selectedReflection || !lessonContent) return
    setValidating(true)
    advanceCard(5)

    try {
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const mimeType = photoUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

      const res = await fetch(`${API_BASE}/lesson/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_base64: base64,
          photo_media_type: mimeType,
          reflection_choice: selectedReflection,
          lesson_title: params.lessonTitle,
          mission_description: lessonContent.card4.description,
          buddy_name: params.buddyName,
          goal: params.goal,
          lesson_type: params.lessonType,
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setValidationResult(data)
    } catch {
      setValidationResult({
        feedback: `Good effort on this one! Every session builds on the last — keep it up.`,
        xp_earned: 50,
      })
    } finally {
      setValidating(false)
    }
  }

  // ── Complete ────────────────────────────────────────────────────────────────
  const handleComplete = () => {
    params.onComplete(params.lessonId)
    navigation.goBack()
  }

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

  const renderCard1 = () => {
    const isReady = !loading && !!lessonContent
    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <Companion size={100} mood={isReady ? 'happy' : 'thinking'} />
        </View>
        <View style={styles.messageCard}>
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

  const renderCard2 = () => {
    if (!lessonContent) return null
    const { card2 } = lessonContent
    const hasVideo = !!card2.video_key

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionRow}>
          <Companion size={60} mood="idle" />
        </View>
        <View style={styles.messageCard}>
          <Text style={styles.bodyText}>{card2.companion_tip}</Text>
        </View>
        <View style={styles.videoContainer}>
          {hasVideo ? (
            <>
              <WebView
                style={styles.webView}
                source={{ uri: `https://www.youtube.com/embed/${card2.video_key}?autoplay=0&playsinline=1` }}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction
                onLoad={() => setWebViewLoaded(true)}
              />
              {!webViewLoaded && (
                <View style={[styles.videoPlaceholder, StyleSheet.absoluteFill]}>
                  <Text style={styles.videoPlaceholderIcon}>▶</Text>
                  <Text style={styles.videoPlaceholderText}>Video loading...</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderIcon}>🎬</Text>
              <Text style={styles.videoPlaceholderText}>Video coming soon</Text>
            </View>
          )}
        </View>
        <View style={styles.spacer} />
        <Pressable onPress={() => advanceCard(2)} style={[styles.primaryBtn, shadows.mint]}>
          <Text style={styles.primaryBtnText}>Continue →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  const renderCard3 = () => {
    if (!lessonContent) return null
    const { card3 } = lessonContent

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionRow}>
          <Companion size={60} mood="idle" />
        </View>
        <Text style={styles.bodyText}>{card3.explanation}</Text>
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
        <Pressable onPress={() => advanceCard(3)} style={[styles.primaryBtn, shadows.mint]}>
          <Text style={styles.primaryBtnText}>Continue →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  const renderCard4 = () => {
    if (!lessonContent) return null
    const { card4 } = lessonContent

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <Companion size={80} mood={missionActive ? 'idle' : 'excited'} />
        </View>
        <Text style={styles.sectionHeading}>Your Mission</Text>
        <Text style={styles.bodyText}>{card4.description}</Text>
        <View style={styles.focusCallout}>
          <Text style={styles.focusCalloutText}>{card4.focus_point}</Text>
        </View>
        <View style={styles.durationRow}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationBadgeText}>~{card4.duration_minutes} min</Text>
          </View>
          {missionActive && (
            <Text style={styles.elapsedText}>Time elapsed: {formatElapsed(elapsedSeconds)}</Text>
          )}
        </View>
        <View style={styles.spacer} />
        {!missionActive ? (
          <Pressable
            onPress={() => setMissionActive(true)}
            style={[styles.primaryBtn, shadows.mint]}
          >
            <Text style={styles.primaryBtnText}>I'm ready →</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => advanceCard(4)}
            style={[styles.primaryBtn, styles.peachBtn, shadows.peach]}
          >
            <Text style={styles.primaryBtnText}>Complete</Text>
          </Pressable>
        )}
      </ScrollView>
    )
  }

  const renderCard5 = () => {
    if (!lessonContent) return null
    const { card5 } = lessonContent
    const canSubmit = !!photoUri && !!selectedReflection

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionRow}>
          <Companion size={60} mood="happy" />
        </View>
        <Text style={styles.bodyText}>{card5.prompt}</Text>

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
          {card5.reflection_choices.map((choice, i) => {
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

  const renderCard6 = () => {
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

    return (
      <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.companionCenter}>
          <Animated.View style={{ transform: [{ scale: companionScale }] }}>
            <Companion size={100} mood="excited" />
          </Animated.View>
        </View>
        <Animated.View style={[styles.messageCard, { opacity: feedbackOpacity }]}>
          <Text style={styles.bodyText}>{validationResult.feedback}</Text>
        </Animated.View>
        <View style={styles.xpRow}>
          <Animated.View style={[styles.xpBadge, { transform: [{ scale: xpScale }] }]}>
            <Text style={styles.xpBadgeText}>✦ +{validationResult.xp_earned} XP</Text>
          </Animated.View>
        </View>
        <View style={styles.spacer} />
        <Pressable onPress={handleComplete} style={[styles.primaryBtn, shadows.mint]}>
          <Text style={styles.primaryBtnText}>Back to your path →</Text>
        </Pressable>
      </ScrollView>
    )
  }

  // ── Card dispatch ───────────────────────────────────────────────────────────
  const cards = [renderCard1, renderCard2, renderCard3, renderCard4, renderCard5, renderCard6]

  return (
    <SafeAreaView style={styles.container}>
      <ProgressIndicator current={cardIndex} progressAnim={progressAnim} />
      <Animated.View
        style={[
          styles.cardWrapper,
          { opacity: cardOpacity, transform: [{ translateX: cardTranslateX }] },
        ]}
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
  peachBtn: {
    backgroundColor: colors.peach,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
  },

  // Video
  videoContainer: {
    width: '100%',
    height: 320,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginBottom: 20,
  },
  webView: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  videoPlaceholderIcon: {
    fontSize: 36,
    marginBottom: 8,
    color: colors.muted,
  },
  videoPlaceholderText: {
    fontFamily: 'Nunito_400Regular',
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

  // Card 4 — Mission
  focusCallout: {
    backgroundColor: colors.golden + '33',
    borderLeftWidth: 3,
    borderLeftColor: colors.golden,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: 12,
  },
  focusCalloutText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  durationBadgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
  },
  elapsedText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
  },

  // Card 5 — Photo
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
    color: colors.white,
  },

  // Card 5 — Reflection
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

  // Card 6 — Loading
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

  // Card 6 — XP badge
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
})
