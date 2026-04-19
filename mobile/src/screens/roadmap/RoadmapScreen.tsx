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
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser } from '@clerk/clerk-expo'
import Svg, { Path, Ellipse, Circle } from 'react-native-svg'
import MonkeyMascot from '../../components/MonkeyMascot'
import PathTrail from '../../components/PathTrail'
import PathNode from '../../components/PathNode'
import TabBar from '../../components/TabBar'
import { computePathLayout } from '../../utils/computePathLayout'
import { colors, radius, shadows } from '../../theme'

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
  goal: string; roadmap: Roadmap
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

// ── HUD Icons ─────────────────────────────────────────────────────────────────

function BananaIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M 12 4 Q 18 3 20 8 Q 22 13 18 17 Q 14 21 8 20 Q 4 17 5 12 Q 6 7 12 4 Z"
        fill="none"
        stroke="#854836"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 12 4 Q 11 6 10 9"
        stroke="#854836"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}

function FlameIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M 12 2 Q 14 6 13 9 Q 16 6 16 10 Q 20 8 18 14 Q 17 19 12 21 Q 7 19 6 14 Q 4 8 8 10 Q 8 6 12 2 Z"
        fill="none"
        stroke="#854836"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [colors.accent, '#ff8c42', '#ffcf77', '#c9b8af', '#854836', '#f5d9a8']
const CONFETTI_COUNT = 40

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
          Animated.timing(p.y, { toValue: SH + 40, duration: 1400 + Math.random() * 800, delay: p.delay, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(p.delay + 800),
            Animated.timing(p.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
          Animated.timing(p.rot, { toValue: p.maxRot, duration: 2000 + Math.random() * 800, delay: p.delay, useNativeDriver: true }),
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
              borderWidth: 1,
              borderColor: colors.ink,
              transform: [{ translateY: p.y }, { rotate }],
              opacity: p.opacity,
            }}
          />
        )
      })}
    </View>
  )
}

// ── Chapter header block ───────────────────────────────────────────────────────

function ChapterHeader({ chapter, y, chapterIndex }: { chapter: Chapter; y: number; chapterIndex: number }) {
  return (
    <View style={[chStyles.wrap, { top: y }]}>
      <View style={chStyles.chip}>
        <Text style={chStyles.chipText}>CHAPTER {chapterIndex + 1}</Text>
      </View>
      <Text style={chStyles.title}>{chapter.title}</Text>
    </View>
  )
}

const chStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 6,
  },
  chipText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: colors.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
  },
})

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RoadmapScreen() {
  const route = useRoute<RouteProp<{ params: RoadmapParams }, 'params'>>()
  const { roadmap: initialRoadmap, initialActiveIndex, goal } = route.params as RoadmapParams
  const { user } = useUser()
  const navigation = useNavigation<StackNavigationProp<any>>()

  const [roadmap] = useState<Roadmap | undefined>(initialRoadmap)

  useEffect(() => {
    if (!roadmap) navigation.replace('Loading')
  }, [roadmap])

  const allLessons = roadmap?.chapters.flatMap(c => c.lessons) ?? []
  const totalLessons = allLessons.length

  const [activeIndex, setActiveIndex] = useState(initialActiveIndex ?? 0)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [fullyCompleteKeys, setFullyCompleteKeys] = useState<Set<string>>(new Set())
  const activeIndexRef = useRef(activeIndex)
  useEffect(() => { activeIndexRef.current = activeIndex })
  const lastProcessedLessonId = useRef<string | null>(null)

  const allChaptersGenerated = roadmap?.chapters.every(ch => ch.lessons.length > 0) ?? false
  const isCompleted = allChaptersGenerated && totalLessons > 0 && activeIndex >= totalLessons

  const scrollRef = useRef<ScrollView>(null)
  const confettiTriggerRef = useRef<((isMilestone: boolean) => void) | null>(null)
  const shakeAnim = useRef(new Animated.Value(0)).current

  // Compute XP from completed lessons
  const earnedXP = activeIndex * 30

  const saveProgress = async (newIndex: number) => {
    if (!user?.id) return
    try {
      await fetch(`${API_BASE}/roadmap/${user.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_index: newIndex }),
      })
    } catch { /* fire-and-forget */ }
  }

  const triggerShake = () => {
    Animated.sequence(
      [5, -5, 4, -4, 3, -3, 2, -2, 1, 0].map(x =>
        Animated.timing(shakeAnim, { toValue: x, duration: 35, useNativeDriver: true })
      )
    ).start()
  }

  const indexMap = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    let i = 0
    for (const ch of roadmap?.chapters ?? [])
      for (const l of ch.lessons)
        indexMap.current.set(l.id, i++)
  }, [roadmap])

  const getChapterForLesson = (lessonId: string): string => {
    for (const ch of roadmap?.chapters ?? []) {
      if (ch.lessons.find(l => l.id === lessonId)) return ch.title
    }
    return ''
  }

  const layout = useMemo(() => computePathLayout(roadmap?.chapters ?? []), [roadmap?.chapters])

  useEffect(() => {
    if (layout.nodePositions[activeIndex]) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, layout.nodePositions[activeIndex].y - 200),
        animated: true,
      })
    }
  }, [activeIndex])

  if (!roadmap) return null

  const handleNodePress = (lesson: Lesson) => {
    const idx = indexMap.current.get(lesson.id) ?? -1
    if (idx > activeIndex) return
    setSelectedLesson(lesson)
    setModalOpen(true)
  }

  const handleStart = () => {
    if (!selectedLesson) return
    const lessonId = selectedLesson.id
    const lessonKey = `${lessonId}_${selectedLesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    setModalOpen(false)
    navigation.navigate('LessonScreen', {
      lessonKey,
      lessonTitle: selectedLesson.title,
      chapterTitle: getChapterForLesson(lessonId),
      goal: route.params.goal,
      experience: (route.params as RoadmapParams).experience,
      completedLessonTitles: allLessons.slice(0, activeIndex).map(l => l.title),
      domain: 'cooking',
      userId: user?.id ?? null,
      lessonId,
      onComplete: (completedId: string) => {
        if (completedId === lastProcessedLessonId.current) return
        lastProcessedLessonId.current = completedId
        const idx = indexMap.current.get(completedId) ?? -1
        if (idx === activeIndexRef.current) {
          confettiTriggerRef.current?.(allLessons[idx]?.type === 'milestone')
          triggerShake()
          const newIndex = Math.min(activeIndexRef.current + 1, totalLessons)
          setActiveIndex(newIndex)
          saveProgress(newIndex)
        }
      },
      onFullyComplete: (key: string) => {
        setFullyCompleteKeys(prev => new Set([...prev, key]))
      },
    })
  }

  const progressLength = layout.cumulativeLengths[activeIndex] ?? 0
  const totalLength = layout.cumulativeLengths[layout.cumulativeLengths.length - 1] ?? 1

  // ── Modal ──────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedLesson) return null
    return (
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalOpen(false)} />
        <View style={styles.sheet}>
          {/* Drag indicator */}
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{selectedLesson.title}</Text>
          <View style={styles.sheetMeta}>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>
                {selectedLesson.type === 'milestone' ? 'MILESTONE'
                  : selectedLesson.type === 'practice' ? 'PRACTICE'
                  : 'LESSON'}
              </Text>
            </View>
            <Text style={styles.sheetMins}>⏱ {selectedLesson.estimatedMinutes} min</Text>
          </View>
          <Pressable onPress={handleStart} style={styles.startBtn}>
            <Text style={styles.startBtnText}>Start Lesson →</Text>
          </Pressable>
          <Pressable onPress={() => setModalOpen(false)} style={styles.notNow}>
            <Text style={styles.notNowText}>Not now</Text>
          </Pressable>
        </View>
      </Modal>
    )
  }

  // Current chapter index for HUD
  let currentChapterIndex = 0
  let count = 0
  for (let ci = 0; ci < (roadmap.chapters.length); ci++) {
    count += roadmap.chapters[ci].lessons.length
    if (activeIndex < count) {
      currentChapterIndex = ci
      break
    }
    currentChapterIndex = ci
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>

      {/* ── HUD Header ── */}
      <View style={styles.hud}>
        <Text style={styles.hudUnitTitle}>UNIT {currentChapterIndex + 1}</Text>
        <View style={styles.hudStats}>
          <View style={styles.statPill}>
            <BananaIcon />
            <Text style={styles.statNum}>{earnedXP.toLocaleString()}</Text>
          </View>
          <View style={styles.statPill}>
            <FlameIcon />
            <Text style={styles.statNum}>0</Text>
          </View>
        </View>
      </View>

      {isCompleted ? (
        <View style={styles.completionContent}>
          <MonkeyMascot size={100} mood="excited" />
          <Text style={styles.completionTitle}>You did it!</Text>
          <Text style={styles.completionGoal}>{goal}</Text>
          <Text style={styles.completionStats}>
            {totalLessons} lessons · {roadmap.chapters.length} chapters
          </Text>
          <Pressable onPress={() => navigation.replace('GoalSelection')} style={styles.newGoalBtn}>
            <Text style={styles.newGoalBtnText}>Start a new goal →</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { height: layout.totalHeight + 120 }]}
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
          {layout.chapterHeaderPositions.map(({ y, chapter }, ci) => (
            <ChapterHeader key={chapter.id} chapter={chapter} y={y} chapterIndex={ci} />
          ))}

          {/* Nodes along the path */}
          {layout.nodePositions.map(({ x, y, lesson, globalIndex, labelSide }) => {
            const isDone = globalIndex < activeIndex
            const lessonKey = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
            return (
              <PathNode
                key={lesson.id}
                lesson={lesson}
                x={x}
                y={y}
                labelSide={labelSide}
                isDone={isDone}
                isPartialComplete={isDone && !fullyCompleteKeys.has(lessonKey)}
                isActive={globalIndex === activeIndex}
                isLocked={globalIndex > activeIndex}
                onPress={handleNodePress}
              />
            )
          })}
        </ScrollView>
      )}

      <TabBar activeTab="roadmap" />
      <ConfettiOverlay triggerRef={confettiTriggerRef} />
      {renderModal()}
    </Animated.View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // HUD
  hud: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 3.5,
    borderBottomColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudUnitTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  hudStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 100,
    backgroundColor: colors.panel,
  },
  statNum: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: colors.ink,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },

  // Modal overlay + sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: colors.ink,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: colors.locked,
    borderRadius: 3,
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  typePill: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.accent,
    borderWidth: 2.5,
    borderColor: colors.ink,
  },
  typePillText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: colors.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sheetMins: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.inkSoft,
  },
  startBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 3.5,
    borderColor: colors.ink,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  startBtnText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: colors.ink,
  },
  notNow: { paddingVertical: 8 },
  notNowText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.inkSoft,
  },

  // Completion state
  completionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  completionTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 36,
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  completionGoal: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  completionStats: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 32,
  },
  newGoalBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 3.5,
    borderColor: colors.ink,
    paddingVertical: 18,
    alignItems: 'center',
  },
  newGoalBtnText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: colors.ink,
  },
})
