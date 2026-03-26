import React, { useRef, useEffect } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native'
import Companion from './Companion'
import { colors } from '../theme'

const { width: SW } = Dimensions.get('window')
const NODE_SIZE = 58
const MILESTONE_SIZE = 68
const LABEL_GAP = 10
const EDGE_PADDING = 16

// ── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  type: 'lesson' | 'practice' | 'milestone'
  emoji: string
  estimatedMinutes: number
  side: 'left' | 'right'
}

interface PathNodeProps {
  lesson: Lesson
  x: number
  y: number
  labelSide: 'left' | 'right'
  isDone: boolean
  isActive: boolean
  isLocked: boolean
  onPress: (lesson: Lesson) => void
}

// ── Active node pulse ────────────────────────────────────────────────────────

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

// ── Node content ─────────────────────────────────────────────────────────────

function NodeContent({ isDone, isActive, isMilestone }: {
  isDone: boolean; isActive: boolean; isMilestone: boolean
}) {
  if (isDone && isMilestone) return <Text style={styles.nodeIconText}>✓🏆</Text>
  if (isDone) return <Text style={styles.nodeCheck}>✓</Text>
  if (isActive && isMilestone) return <Text style={styles.nodeIconText}>🏆</Text>
  if (isActive) return <Text style={styles.nodeGo}>GO</Text>
  if (isMilestone) return <Text style={styles.nodeIconText}>🏆</Text>
  return null
}

// ── PathNode ─────────────────────────────────────────────────────────────────

function PathNodeInner({ lesson, x, y, labelSide, isDone, isActive, isLocked, onPress }: PathNodeProps) {
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
    <View style={nodeStyle as object[]}>
      <NodeContent isDone={isDone} isActive={isActive} isMilestone={isMilestone} />
    </View>
  )

  // Compute label positioning
  const labelMaxWidth = labelSide === 'left'
    ? x - size / 2 - LABEL_GAP - EDGE_PADDING
    : SW - (x + size / 2 + LABEL_GAP) - EDGE_PADDING

  return (
    <View style={[styles.wrapper, { left: x - size / 2, top: y - size / 2 }]}>
      {/* Companion above active node */}
      {isActive && (
        <View style={styles.companion}>
          <Companion size={48} mood="happy" />
        </View>
      )}

      {/* Node */}
      <Pressable onPress={() => onPress(lesson)} disabled={isLocked}>
        {isActive ? <ActiveNodeWrap size={size}>{nodeInner}</ActiveNodeWrap> : nodeInner}
      </Pressable>

      {/* Label */}
      <Text
        style={[
          labelStyle,
          labelSide === 'left'
            ? { position: 'absolute', right: size + LABEL_GAP, textAlign: 'right', maxWidth: labelMaxWidth }
            : { position: 'absolute', left: size + LABEL_GAP, textAlign: 'left', maxWidth: labelMaxWidth },
          { top: (size - 18) / 2 },
        ]}
        numberOfLines={3}
      >
        {lesson.title}
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
  nodeLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
  companion: {
    position: 'absolute',
    top: -44,
    alignSelf: 'center',
    zIndex: 10,
  },
})
