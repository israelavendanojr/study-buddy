import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
} from 'react-native'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import Companion from '../components/Companion'
import PathTrail from '../components/PathTrail'
import PathNode from '../components/PathNode'
import { computePathLayout } from '../utils/computePathLayout'
import { colors, radius, shadows } from '../theme'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  type: 'lesson' | 'practice' | 'milestone'
  estimatedMinutes: number
}
interface Chapter { id: string; title: string; lessons: Lesson[] }
interface Roadmap { title: string; chapters: Chapter[] }
interface RoadmapParams {
  goal: string; buddyName: string; roadmap: Roadmap
  roadmapId?: number | null
  initialActiveIndex?: number
  experience: number
  sessionHours: number
  sessionMinutes: number
  weeks: number
  coachingResult?: object | null
  [key: string]: unknown
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

const { width: SW, height: SH } = Dimensions.get('window')

// ── Tab icons (SVG) ───────────────────────────────────────────────────────────

function MapIcon({ active }: { active?: boolean }) {
  const c = active ? colors.mint : colors.muted
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 4v13M15 7v13" stroke={c} strokeWidth={1.8} />
    </Svg>
  )
}
function HomeIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={colors.muted} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 21V12h6v9" stroke={colors.muted} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}
function BadgeIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="9" r="6" stroke={colors.muted} strokeWidth={1.8} />
      <Path d="M8.5 14.5L7 21l5-2 5 2-1.5-6.5" stroke={colors.muted} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  colors.mint, colors.peach, colors.golden, colors.sky, colors.lavender, '#FF8FAB',
]
const CONFETTI_COUNT = 50

interface ConfettiPiece {
  x: number
  y: Animated.Value
  opacity: Animated.Value
  rot: Animated.Value
  color: string
  w: number
  h: number
  delay: number
  maxRot: number
}

function makeConfettiPieces(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, () => ({
    x: Math.random() * SW,
    y: new Animated.Value(-30),
    opacity: new Animated.Value(0),
    rot: new Animated.Value(0),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    w: Math.random() * 9 + 5,
    h: Math.random() * 7 + 4,
    delay: Math.random() * 500,
    maxRot: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
  }))
}

function ConfettiOverlay({ triggerRef }: { triggerRef: React.MutableRefObject<((isMilestone: boolean) => void) | null> }) {
  const pieces = useRef(makeConfettiPieces()).current

  useEffect(() => {
    triggerRef.current = (isMilestone: boolean) => {
      const active = isMilestone ? pieces : pieces.slice(0, 20)
      active.forEach(p => {
        p.y.setValue(-30)
        p.opacity.setValue(1)
        p.rot.setValue(0)

        Animated.parallel([
          Animated.timing(p.y, {
            toValue: SH + 40,
            duration: 1400 + Math.random() * 800,
            delay: p.delay,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(p.delay + 800),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.rot, {
            toValue: p.maxRot,
            duration: 2000 + Math.random() * 800,
            delay: p.delay,
            useNativeDriver: true,
          }),
        ]).start()
      })
    }
  }, [])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const absMax = Math.abs(p.maxRot)
        const rotate = p.rot.interpolate({
          inputRange: p.maxRot < 0 ? [-absMax, 0] : [0, absMax],
          outputRange: p.maxRot < 0 ? [`-${absMax}deg`, '0deg'] : ['0deg', `${absMax}deg`],
        })
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              borderRadius: 2,
              transform: [{ translateY: p.y }, { rotate }],
              opacity: p.opacity,
            }}
          />
        )
      })}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RoadmapScreen() {
  const route = useRoute<RouteProp<{ params: RoadmapParams }, 'params'>>()
  const { roadmap: initialRoadmap, initialActiveIndex, goal, experience, sessionHours, sessionMinutes, weeks, coachingResult } = route.params as RoadmapParams
  const { user } = useUser()
  const navigation = useNavigation<StackNavigationProp<any>>()

  const [roadmap, setRoadmap] = useState<Roadmap>(initialRoadmap)

  const allLessons = roadmap.chapters.flatMap(c => c.lessons)
  const totalLessons = allLessons.length

  const [activeIndex, setActiveIndex] = useState(initialActiveIndex ?? 0)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  const allChaptersGenerated = roadmap.chapters.every(ch => ch.lessons.length > 0)
  const isCompleted = allChaptersGenerated && totalLessons > 0 && activeIndex >= totalLessons

  const scrollRef = useRef<ScrollView>(null)
  const confettiTriggerRef = useRef<((isMilestone: boolean) => void) | null>(null)
  const shakeAnim = useRef(new Animated.Value(0)).current

  const generateNextChapter = async (completedChapterIndex: number) => {
    if (!user?.id) return
    const nextChapterIndex = completedChapterIndex + 1
    if (nextChapterIndex >= roadmap.chapters.length) return

    const nextChapter = roadmap.chapters[nextChapterIndex]
    if (nextChapter.lessons.length > 0) return  // already generated

    const previousSummaries = roadmap.chapters
      .slice(0, nextChapterIndex)
      .map(ch => ({ title: ch.title, lessonTitles: ch.lessons.map(l => l.title) }))

    try {
      const res = await fetch(`${API_BASE}/roadmap/next-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          chapter_id: nextChapter.id,
          chapter_title: nextChapter.title,
          chapter_index: nextChapterIndex,
          total_chapters: roadmap.chapters.length,
          previous_chapter_summaries: previousSummaries,
          goal, experience,
          session_hours: sessionHours,
          session_minutes: sessionMinutes,
          weeks,
          coaching_result: coachingResult ?? null,
        }),
      })
      if (!res.ok) return
      const { lessons } = await res.json()
      setRoadmap(prev => ({
        ...prev,
        chapters: prev.chapters.map((ch, idx) =>
          idx === nextChapterIndex ? { ...ch, lessons } : ch
        ),
      }))
    } catch { /* fail silently */ }
  }

  const saveProgress = async (newIndex: number) => {
    if (!user?.id) return
    try {
      await fetch(`${API_BASE}/roadmap/${user.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_index: newIndex }),
      })
    } catch { /* fire-and-forget — UI never blocks on this */ }
  }

  const triggerShake = () => {
    Animated.sequence(
      [5, -5, 4, -4, 3, -3, 2, -2, 1, 0].map(x =>
        Animated.timing(shakeAnim, { toValue: x, duration: 35, useNativeDriver: true })
      )
    ).start()
  }

  // Build id→index map — rebuilds whenever lessons are appended
  const indexMap = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    let i = 0
    for (const ch of roadmap.chapters)
      for (const l of ch.lessons)
        indexMap.current.set(l.id, i++)
  }, [roadmap])

  // Compute the winding path layout
  const layout = useMemo(() => computePathLayout(roadmap.chapters), [roadmap.chapters])

  // Auto-scroll to active node
  useEffect(() => {
    if (layout.nodePositions[activeIndex]) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, layout.nodePositions[activeIndex].y - 200),
        animated: true,
      })
    }
  }, [activeIndex])

  const handleNodePress = (lesson: Lesson) => {
    const idx = indexMap.current.get(lesson.id) ?? -1
    if (idx > activeIndex) return
    setSelectedLesson(lesson)
    setModalOpen(true)
  }

  const handleStart = () => {
    const idx = indexMap.current.get(selectedLesson?.id ?? '') ?? -1
    setModalOpen(false)
    if (idx === activeIndex) {
      confettiTriggerRef.current?.(selectedLesson?.type === 'milestone')
      triggerShake()
      const newIndex = Math.min(activeIndex + 1, totalLessons)
      setActiveIndex(newIndex)
      saveProgress(newIndex)
      // Generate next chapter when milestone is hit
      if (selectedLesson?.type === 'milestone') {
        const chapterIndex = roadmap.chapters.findIndex(c =>
          c.lessons.some(l => l.id === selectedLesson.id)
        )
        if (chapterIndex !== -1) generateNextChapter(chapterIndex)
      }
    }
  }

  // ── Progress path length ────────────────────────────────────────────────

  const progressLength = layout.cumulativeLengths[activeIndex] ?? 0
  const totalLength = layout.cumulativeLengths[layout.cumulativeLengths.length - 1] ?? 1

  // ── Modal ──────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedLesson) return null
    const typeColor = selectedLesson.type === 'milestone' ? colors.golden
      : selectedLesson.type === 'practice' ? colors.peach : colors.mint
    return (
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{selectedLesson.title}</Text>
          <View style={styles.sheetMeta}>
            <View style={[styles.typePill, { backgroundColor: typeColor + '33' }]}>
              <Text style={styles.typePillText}>{selectedLesson.type}</Text>
            </View>
            <Text style={styles.sheetMins}>⏱ {selectedLesson.estimatedMinutes} min</Text>
          </View>
          <Pressable onPress={handleStart} style={[styles.startBtn, shadows.mint]}>
            <Text style={styles.startBtnText}>Start Lesson →</Text>
          </Pressable>
          <Pressable onPress={() => setModalOpen(false)} style={styles.notNow}>
            <Text style={styles.notNowText}>Not now</Text>
          </Pressable>
        </View>
      </Modal>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const progressPct = totalLessons > 0 ? activeIndex / totalLessons : 0

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Roadmap</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{activeIndex} / {totalLessons} lessons</Text>
      </View>

      {isCompleted ? (
        <View style={styles.completionContent}>
          <Companion size={80} mood="excited" />
          <Text style={styles.completionTitle}>You did it! 🎉</Text>
          <Text style={styles.completionGoal}>{goal}</Text>
          <Text style={styles.completionStats}>
            {totalLessons} lessons · {roadmap.chapters.length} chapters
          </Text>
          <Pressable
            onPress={() => navigation.replace('Onboarding')}
            style={[styles.newGoalBtn, shadows.mint]}
          >
            <Text style={styles.newGoalBtnText}>Start a new goal →</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { height: layout.totalHeight + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* SVG winding path */}
          <PathTrail
            pathD={layout.pathD}
            totalHeight={layout.totalHeight}
            progressLength={progressLength}
            totalLength={totalLength}
          />

          {/* Chapter headers */}
          {layout.chapterHeaderPositions.map(({ y, chapter }) => {
            const isLocked = chapter.lessons.length === 0
            return (
              <View key={chapter.id} style={[styles.chapterHeader, { top: y }]}>
                <Text style={[styles.chapterTitle, isLocked && { color: colors.muted }]}>
                  {isLocked ? '🔒 ' : ''}{chapter.title}
                </Text>
                <View style={[styles.chapterUnderline, isLocked && { backgroundColor: colors.border }]} />
              </View>
            )
          })}

          {/* Nodes along the path */}
          {layout.nodePositions.map(({ x, y, lesson, globalIndex, labelSide }) => (
            <PathNode
              key={lesson.id}
              lesson={lesson}
              x={x}
              y={y}
              labelSide={labelSide}
              isDone={globalIndex < activeIndex}
              isActive={globalIndex === activeIndex}
              isLocked={globalIndex > activeIndex}
              onPress={handleNodePress}
            />
          ))}
        </ScrollView>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Pressable style={styles.tab}>
          <MapIcon active />
          <Text style={[styles.tabLabel, { color: colors.mint }]}>Path</Text>
          <View style={styles.tabIndicator} />
        </Pressable>
        <Pressable style={styles.tab}>
          <HomeIcon />
          <Text style={styles.tabLabel}>Home</Text>
        </Pressable>
        <Pressable style={styles.tab}>
          <BadgeIcon />
          <Text style={styles.tabLabel}>Badges</Text>
        </Pressable>
      </View>

      <ConfettiOverlay triggerRef={confettiTriggerRef} />
      {renderModal()}
    </Animated.View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Header
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 14,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 24,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBg: {
    height: 7,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 7,
    backgroundColor: colors.mint,
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },
  // Chapter headers (absolutely positioned)
  chapterHeader: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  chapterTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 6,
  },
  chapterUnderline: {
    height: 2,
    width: 120,
    backgroundColor: colors.mint,
    borderRadius: 2,
  },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 21,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 12,
  },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  typePill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  typePillText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: colors.foreground },
  sheetMins: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.muted },
  startBtn: {
    width: '100%',
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  startBtnText: { fontFamily: 'FredokaOne_400Regular', fontSize: 18, color: colors.foreground },
  notNow: { paddingVertical: 8 },
  notNowText: { fontFamily: 'Nunito_400Regular', fontSize: 16, color: colors.muted },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 28,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.muted,
  },
  tabIndicator: {
    width: 20,
    height: 3,
    backgroundColor: colors.mint,
    borderRadius: 2,
    marginTop: 2,
  },
  // Completion state (replaces scroll content)
  completionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  completionTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 28,
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  completionGoal: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  completionStats: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 32,
  },
  newGoalBtn: {
    width: '100%',
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  newGoalBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 17,
    color: colors.foreground,
  },
})
