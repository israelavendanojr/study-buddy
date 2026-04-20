import React, { useRef, useEffect } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native'
import Svg, { Path, Circle, Rect, Line, G } from 'react-native-svg'
import { colors } from '../theme'

const { width: SW } = Dimensions.get('window')
const NODE_SIZE = 84
const MILESTONE_SIZE = 104
const LABEL_GAP = 12
const EDGE_PADDING = 16

// ── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  type: 'lesson' | 'practice' | 'milestone' | 'recipe' | 'minigame'
  estimatedMinutes: number
  lesson_type?: 'technique' | 'food_science' | 'recipe' | 'minigame' | 'concept'
}

interface PathNodeProps {
  lesson: Lesson
  x: number
  y: number
  labelSide: 'left' | 'right'
  isDone: boolean
  isPartialComplete?: boolean
  isActive: boolean
  isLocked: boolean
  onPress: (lesson: Lesson) => void
}

// ── Lesson type illustrations ─────────────────────────────────────────────────

function LessonIllustration({ lessonType, state }: {
  lessonType?: string
  state: 'done' | 'active' | 'locked' | 'milestone'
}) {
  const strokeColor = state === 'locked' ? '#c9b8af' : '#854836'
  const sw = 3

  if (state === 'milestone') {
    // Chest/trophy
    return (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Rect x="8" y="18" width="28" height="20" rx="4" fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Rect x="8" y="18" width="28" height="8" rx="4" fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Line x1="22" y1="18" x2="22" y2="38" stroke={strokeColor} strokeWidth={sw} />
        <Circle cx="22" cy="28" r="3" fill={strokeColor} />
        <Path d="M 14 18 Q 14 10 22 10 Q 30 10 30 18" stroke={strokeColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
      </Svg>
    )
  }

  if (lessonType === 'technique') {
    // Knife
    return (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Path d="M 10 34 L 30 14 Q 34 10 38 12 L 36 16 Q 34 14 32 16 L 12 36 Z" fill="none" stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round" />
        <Rect x="8" y="32" width="10" height="6" rx="2" fill="none" stroke={strokeColor} strokeWidth={sw} />
      </Svg>
    )
  }

  if (lessonType === 'recipe') {
    // Pot
    return (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Path d="M 10 20 L 10 36 Q 10 40 22 40 Q 34 40 34 36 L 34 20 Z" fill="none" stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round" />
        <Rect x="8" y="18" width="28" height="4" rx="2" fill="none" stroke={strokeColor} strokeWidth={sw} />
        <Line x1="6" y1="20" x2="6" y2="28" stroke={strokeColor} strokeWidth={sw} strokeLinecap="round" />
        <Line x1="38" y1="20" x2="38" y2="28" stroke={strokeColor} strokeWidth={sw} strokeLinecap="round" />
        <Path d="M 16 18 Q 16 12 22 12 Q 28 12 28 18" stroke={strokeColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
      </Svg>
    )
  }

  if (lessonType === 'food_science') {
    // Flask
    return (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Path d="M 16 8 L 16 22 L 8 36 Q 6 40 22 40 Q 38 40 36 36 L 28 22 L 28 8 Z" fill="none" stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round" />
        <Line x1="13" y1="8" x2="31" y2="8" stroke={strokeColor} strokeWidth={sw} strokeLinecap="round" />
        <Circle cx="16" cy="32" r="2.5" fill={strokeColor} />
        <Circle cx="26" cy="35" r="2" fill={strokeColor} />
      </Svg>
    )
  }

  if (lessonType === 'minigame') {
    // Star / game controller
    return (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Path d="M 22 6 L 26 16 L 38 16 L 28 24 L 32 36 L 22 28 L 12 36 L 16 24 L 6 16 L 18 16 Z" fill="none" stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round" />
      </Svg>
    )
  }

  // concept / default: book
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x="10" y="8" width="24" height="30" rx="3" fill="none" stroke={strokeColor} strokeWidth={sw} />
      <Line x1="10" y1="14" x2="34" y2="14" stroke={strokeColor} strokeWidth={sw} />
      <Line x1="15" y1="20" x2="29" y2="20" stroke={strokeColor} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="15" y1="26" x2="29" y2="26" stroke={strokeColor} strokeWidth={sw} strokeLinecap="round" />
      <Line x1="15" y1="32" x2="23" y2="32" stroke={strokeColor} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  )
}

// ── Check icon ────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Path d="M 8 18 L 15 26 L 28 10" stroke="#854836" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

// ── Lock icon ─────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32">
      <Rect x="7" y="14" width="18" height="14" rx="3" fill="none" stroke="#c9b8af" strokeWidth={3} />
      <Path d="M 10 14 L 10 10 Q 10 5 16 5 Q 22 5 22 10 L 22 14" stroke="#c9b8af" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx="16" cy="21" r="2.5" fill="#c9b8af" />
    </Svg>
  )
}

// ── Pulse ring (active node) ──────────────────────────────────────────────────

function PulseRing({ size }: { size: number }) {
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.3, duration: 1800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start()
    return () => {
      scale.stopAnimation()
      opacity.stopAnimation()
    }
  }, [])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size + 20,
        height: size + 20,
        borderRadius: (size + 20) / 2,
        borderWidth: 3.5,
        borderColor: colors.accent,
        top: -10,
        left: -10,
        transform: [{ scale }],
        opacity,
      }}
      pointerEvents="none"
    />
  )
}

// ── Start pill ────────────────────────────────────────────────────────────────

function StartPill() {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
    return () => pulse.stopAnimation()
  }, [])

  return (
    <Animated.View
      style={[
        styles.startPill,
        { transform: [{ scale: pulse }] },
      ]}
    >
      <Text style={styles.startPillText}>START</Text>
    </Animated.View>
  )
}

// ── Float animation wrapper ───────────────────────────────────────────────────

function FloatWrap({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const floatY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(floatY, { toValue: -3, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start()
    return () => floatY.stopAnimation()
  }, [])

  return (
    <Animated.View style={{ transform: [{ translateY: floatY }] }}>
      {children}
    </Animated.View>
  )
}

// ── PathNode ─────────────────────────────────────────────────────────────────

function PathNodeInner({
  lesson, x, y, labelSide,
  isDone, isPartialComplete = false, isActive, isLocked, onPress
}: PathNodeProps) {
  const isMilestone = lesson.type === 'milestone'
  const size = isMilestone ? MILESTONE_SIZE : NODE_SIZE

  // Node background & border
  let bgColor = colors.panel
  let borderColor = colors.ink
  let borderWidth = 3.5

  if (isDone) {
    bgColor = colors.accent
  } else if (isActive) {
    bgColor = colors.panel
    borderWidth = 5
  } else if (isLocked) {
    bgColor = colors.background
    borderColor = colors.locked
    borderWidth = 3.5
  }

  const borderRadius = isMilestone ? 28 : size / 2

  // Node content
  let nodeContent: React.ReactNode = null
  if (isDone) {
    nodeContent = <CheckIcon />
  } else if (isActive) {
    nodeContent = (
      <LessonIllustration
        lessonType={isMilestone ? undefined : lesson.lesson_type}
        state={isMilestone ? 'milestone' : 'active'}
      />
    )
  } else if (isLocked) {
    nodeContent = (
      <LessonIllustration
        lessonType={isMilestone ? undefined : lesson.lesson_type}
        state={isMilestone ? 'milestone' : 'locked'}
      />
    )
  } else {
    nodeContent = (
      <LessonIllustration
        lessonType={isMilestone ? undefined : lesson.lesson_type}
        state={isMilestone ? 'milestone' : 'locked'}
      />
    )
  }

  const labelMaxWidth = labelSide === 'left'
    ? x - size / 2 - LABEL_GAP - EDGE_PADDING
    : SW - (x + size / 2 + LABEL_GAP) - EDGE_PADDING

  const shouldFloat = isDone || isActive

  const nodeView = (
    <View
      style={[
        styles.node,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bgColor,
          borderColor,
          borderWidth,
        },
      ]}
    >
      {nodeContent}
      {isActive && <PulseRing size={size} />}
    </View>
  )

  return (
    <View style={[styles.wrapper, { left: x - size / 2, top: y - size / 2 }]}>
      <Pressable onPress={() => onPress(lesson)} disabled={isLocked}>
        {shouldFloat ? (
          <FloatWrap delay={isDone ? 0 : 2000}>
            {nodeView}
          </FloatWrap>
        ) : nodeView}
      </Pressable>

      {/* "START" pill for active node */}
      {isActive && (
        <View style={[styles.startPillWrap, { top: size / 2 - 18, left: size + 12 }]}>
          <StartPill />
        </View>
      )}

      {/* Label */}
      <Text
        style={[
          styles.nodeLabel,
          isLocked && { color: colors.locked },
          isActive && { color: colors.ink, fontFamily: 'Fredoka_600SemiBold' },
          isDone && { color: colors.inkSoft },
          labelSide === 'left'
            ? { position: 'absolute', right: size + LABEL_GAP, textAlign: 'right', maxWidth: labelMaxWidth }
            : { position: 'absolute', left: size + LABEL_GAP, textAlign: 'left', maxWidth: labelMaxWidth },
          { top: (size - 18) / 2 },
        ]}
        numberOfLines={3}
      >
        {lesson.lesson_type === 'technique' ? `Technique: ${lesson.title}`
          : lesson.lesson_type === 'recipe' ? `Recipe: ${lesson.title}`
          : lesson.lesson_type === 'food_science' ? `Science: ${lesson.title}`
          : lesson.lesson_type === 'concept' ? `Concept: ${lesson.title}`
          : lesson.lesson_type === 'minigame' ? `Minigame: ${lesson.title}`
          : lesson.title}
      </Text>
    </View>
  )
}

export default React.memo(PathNodeInner)

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 1,
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  startPillWrap: {
    position: 'absolute',
  },
  startPill: {
    backgroundColor: colors.panel,
    borderWidth: 3.5,
    borderColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  startPillText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nodeLabel: {
    fontFamily: 'Fredoka_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
})
