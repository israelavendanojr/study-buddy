import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RoadmapScreen() {
  const route = useRoute<RouteProp<{ params: RoadmapParams }, 'params'>>()
  const { roadmap } = route.params as RoadmapParams

  const allLessons = roadmap.chapters.flatMap(c => c.lessons)
  const totalLessons = allLessons.length

  const [activeIndex, setActiveIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  const scrollRef = useRef<ScrollView>(null)

  // Build id→index map
  const indexMap = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    let i = 0
    for (const ch of roadmap.chapters)
      for (const l of ch.lessons)
        indexMap.current.set(l.id, i++)
  }, [])

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
    if (idx === activeIndex)
      setActiveIndex(prev => Math.min(prev + 1, totalLessons))
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

  // ── Render ─────────────────────────────────────────────────────────────

  const progressPct = totalLessons > 0 ? activeIndex / totalLessons : 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Roadmap</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{activeIndex} / {totalLessons} lessons</Text>
      </View>

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
        {layout.chapterHeaderPositions.map(({ y, chapter }) => (
          <View key={chapter.id} style={[styles.chapterHeader, { top: y }]}>
            <Text style={styles.chapterTitle}>{chapter.title}</Text>
            <View style={styles.chapterUnderline} />
          </View>
        ))}

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
