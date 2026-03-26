import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import Companion from '../components/Companion'
import { colors, radius, shadows } from '../theme'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  type: 'lesson' | 'practice' | 'milestone'
  emoji: string
  estimatedMinutes: number
  side: 'left' | 'right'
}
interface Chapter { id: string; title: string; emoji: string; lessons: Lesson[] }
interface Roadmap { title: string; chapters: Chapter[] }
interface RoadmapParams {
  goal: string; buddyName: string; roadmap: Roadmap
  [key: string]: unknown
}

const { width: SW } = Dimensions.get('window')
const HALF = SW / 2
const NODE_SIZE = 58
const MILESTONE_SIZE = 68

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

// ── Node content ──────────────────────────────────────────────────────────────

function NodeContent({ isDone, isActive, isLocked, isMilestone }: {
  isDone: boolean; isActive: boolean; isLocked: boolean; isMilestone: boolean
}) {
  if (isDone && isMilestone) return <Text style={styles.nodeIconText}>✓🏆</Text>
  if (isDone) return <Text style={styles.nodeCheck}>✓</Text>
  if (isActive && isMilestone) return <Text style={styles.nodeIconText}>🏆</Text>
  if (isActive) return <Text style={styles.nodeGo}>GO</Text>
  if (isMilestone) return <Text style={styles.nodeIconText}>🏆</Text>
  return null
}

// ── Active node pulse ─────────────────────────────────────────────────────────

function ActiveNodeWrap({ size, children }: { size: number; children: React.ReactNode }) {
  const pulse = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [])
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: 16 }, { transform: [{ scale: pulse }] }]}>
      {children}
    </Animated.View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RoadmapScreen() {
  const route = useRoute<RouteProp<{ params: RoadmapParams }, 'params'>>()
  const { roadmap } = route.params as RoadmapParams

  const allLessons = roadmap.chapters.flatMap(c => c.lessons)
  const totalLessons = allLessons.length

  const [activeIndex, setActiveIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  // Build id→index map
  const indexMap = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    let i = 0
    for (const ch of roadmap.chapters)
      for (const l of ch.lessons)
        indexMap.current.set(l.id, i++)
  }, [])

  const handleNodePress = (lesson: Lesson) => {
    const idx = indexMap.current.get(lesson.id) ?? -1
    if (idx > activeIndex) return
    setSelectedLesson(lesson)
    setModalOpen(true)
  }

  const handleStart = () => {
    const idx = indexMap.current.get(selectedLesson?.id ?? '') ?? -1
    setModalOpen(false)
    if (idx === activeIndex)
      setActiveIndex(prev => Math.min(prev + 1, totalLessons))
  }

  // ── Render one lesson row ────────────────────────────────────────────────

  const renderLesson = (lesson: Lesson, flatIdx: number) => {
    const isDone = flatIdx < activeIndex
    const isActive = flatIdx === activeIndex
    const isLocked = flatIdx > activeIndex
    const isMilestone = lesson.type === 'milestone'
    const size = isMilestone ? MILESTONE_SIZE : NODE_SIZE

    const nodeStyle = [
      styles.node,
      { width: size, height: size, borderRadius: 16 },
      isDone && { backgroundColor: colors.mint },
      isActive && isMilestone && { backgroundColor: colors.mint },
      isActive && !isMilestone && { backgroundColor: colors.sky },
      isLocked && isMilestone && { backgroundColor: colors.golden + '50' },
      isLocked && !isMilestone && { backgroundColor: colors.border },
    ]

    const labelStyle = [
      styles.nodeLabel,
      isDone && { color: colors.muted },
      isActive && { color: colors.foreground, fontFamily: 'Nunito_700Bold' },
      isLocked && { color: colors.muted },
    ]

    const nodeInner = (
      <View style={[nodeStyle as object]}>
        <NodeContent isDone={isDone} isActive={isActive} isLocked={isLocked} isMilestone={isMilestone} />
      </View>
    )

    const isLeft = lesson.side === 'left'

    return (
      <View key={lesson.id} style={styles.lessonRow}>
        {isLeft ? (
          <>
            {/* Left half: node + label */}
            <View style={styles.leftHalf}>
              <Pressable
                onPress={() => handleNodePress(lesson)}
                disabled={isLocked}
              >
                {isActive
                  ? <ActiveNodeWrap size={size}>{nodeInner}</ActiveNodeWrap>
                  : nodeInner
                }
              </Pressable>
              <Text style={[labelStyle, styles.labelLeft]} numberOfLines={3}>{lesson.title}</Text>
              {/* Companion floats above active left node */}
              {isActive && (
                <View style={styles.companionOnNodeLeft}>
                  <Companion size={48} mood="happy" />
                </View>
              )}
            </View>
            {/* Right half: empty */}
            <View style={styles.rightHalf} />
          </>
        ) : (
          <>
            {/* Left half: empty */}
            <View style={styles.leftHalf} />
            {/* Right half: label + node */}
            <View style={styles.rightHalf}>
              <Text style={[labelStyle, styles.labelRight]} numberOfLines={3}>{lesson.title}</Text>
              <Pressable
                onPress={() => handleNodePress(lesson)}
                disabled={isLocked}
              >
                {isActive
                  ? <ActiveNodeWrap size={size}>{nodeInner}</ActiveNodeWrap>
                  : nodeInner
                }
              </Pressable>
              {/* Companion floats above active right node */}
              {isActive && (
                <View style={styles.companionOnNodeRight}>
                  <Companion size={48} mood="happy" />
                </View>
              )}
            </View>
          </>
        )}
      </View>
    )
  }

  // ── Render chapters ──────────────────────────────────────────────────────

  let globalIdx = 0
  const renderChapters = () =>
    roadmap.chapters.map(chapter => (
      <View key={chapter.id} style={styles.chapterBlock}>
        {/* Chapter header */}
        <View style={styles.chapterHeader}>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
          <View style={styles.chapterUnderline} />
        </View>
        {/* Lessons with center line */}
        <View style={styles.lessonsWrap}>
          {/* Vertical center line */}
          <View style={styles.centerLine} />
          {chapter.lessons.map(lesson => {
            const node = renderLesson(lesson, globalIdx)
            globalIdx++
            return node
          })}
        </View>
      </View>
    ))

  // ── Modal ────────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedLesson) return null
    const typeColor = selectedLesson.type === 'milestone' ? colors.golden
      : selectedLesson.type === 'practice' ? colors.peach : colors.mint
    return (
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetEmoji}>{selectedLesson.emoji}</Text>
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

  // ── Render ───────────────────────────────────────────────────────────────

  const progressPct = totalLessons > 0 ? activeIndex / totalLessons : 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Path 🗺️</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{activeIndex} / {totalLessons} lessons</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderChapters()}
        <View style={{ height: 80 }} />
      </ScrollView>

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

      {renderModal()}
    </View>
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
  // Chapter
  chapterBlock: { marginBottom: 12 },
  chapterHeader: {
    paddingHorizontal: 24,
    marginBottom: 12,
    marginTop: 16,
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
  // Lessons area with center line
  lessonsWrap: {
    position: 'relative',
    paddingBottom: 8,
  },
  centerLine: {
    position: 'absolute',
    left: SW / 2 - 0.75,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  // Lesson row
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    marginBottom: 8,
    zIndex: 1,
  },
  leftHalf: {
    width: HALF,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 12,
    position: 'relative',
  },
  rightHalf: {
    width: HALF,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
    paddingLeft: 12,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nodeCheck: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.white,
  },
  nodeGo: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 15,
    color: colors.foreground,
  },
  nodeIconText: {
    fontSize: 20,
  },
  labelLeft: {
    marginLeft: 10,
    flex: 1,
  },
  labelRight: {
    marginRight: 10,
    flex: 1,
    textAlign: 'right',
  },
  nodeLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
  // Companion on active node
  companionOnNodeLeft: {
    position: 'absolute',
    top: -40,
    left: 12,
    zIndex: 10,
  },
  companionOnNodeRight: {
    position: 'absolute',
    top: -40,
    right: 12,
    zIndex: 10,
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
  sheetEmoji: { fontSize: 44, marginBottom: 10 },
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
})
