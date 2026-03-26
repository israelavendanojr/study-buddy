import { Dimensions } from 'react-native'

// ── Types ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  type: 'lesson' | 'practice' | 'milestone'
  emoji: string
  estimatedMinutes: number
  side: 'left' | 'right'
}

interface Chapter {
  id: string
  title: string
  emoji: string
  lessons: Lesson[]
}

export interface NodePosition {
  x: number
  y: number
  lesson: Lesson
  globalIndex: number
  labelSide: 'left' | 'right'
}

export interface ChapterHeaderPosition {
  y: number
  chapter: Chapter
}

export interface PathLayout {
  nodePositions: NodePosition[]
  chapterHeaderPositions: ChapterHeaderPosition[]
  pathD: string
  totalHeight: number
  cumulativeLengths: number[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window')
const PADDING_H = 60
const CENTER_X = SW / 2
const AMPLITUDE = (SW / 2) - PADDING_H
const VERTICAL_SPACING = 110
const CHAPTER_HEADER_HEIGHT = 70
const CHAPTER_GAP = 24
const TOP_PADDING = 20
const FREQUENCY = (2 * Math.PI) / 5 // one full wave every ~5 nodes

// ── Position computation ─────────────────────────────────────────────────────

export function computePathLayout(chapters: Chapter[]): PathLayout {
  const nodePositions: NodePosition[] = []
  const chapterHeaderPositions: ChapterHeaderPosition[] = []
  let currentY = TOP_PADDING
  let globalIndex = 0

  for (const chapter of chapters) {
    chapterHeaderPositions.push({ y: currentY, chapter })
    currentY += CHAPTER_HEADER_HEIGHT

    for (let i = 0; i < chapter.lessons.length; i++) {
      const lesson = chapter.lessons[i]
      const x = CENTER_X + AMPLITUDE * Math.sin(FREQUENCY * globalIndex)
      const labelSide: 'left' | 'right' = x < CENTER_X ? 'right' : 'left'

      nodePositions.push({ x, y: currentY, lesson, globalIndex, labelSide })
      currentY += VERTICAL_SPACING
      globalIndex++
    }

    currentY += CHAPTER_GAP
  }

  const pathD = generatePathD(nodePositions)
  const cumulativeLengths = computeCumulativeLengths(nodePositions)

  return {
    nodePositions,
    chapterHeaderPositions,
    pathD,
    totalHeight: currentY,
    cumulativeLengths,
  }
}

// ── SVG path generation ──────────────────────────────────────────────────────

function generatePathD(positions: NodePosition[]): string {
  if (positions.length < 2) return ''

  let d = `M ${positions[0].x} ${positions[0].y}`

  for (let i = 0; i < positions.length - 1; i++) {
    const curr = positions[i]
    const next = positions[i + 1]
    const controlOffsetY = (next.y - curr.y) * 0.5

    const cp1x = curr.x
    const cp1y = curr.y + controlOffsetY
    const cp2x = next.x
    const cp2y = next.y - controlOffsetY

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
  }

  return d
}

// ── Cumulative path lengths (straight-line approximation) ────────────────────

function computeCumulativeLengths(positions: NodePosition[]): number[] {
  const lengths = [0]
  let cumulative = 0

  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i - 1].x
    const dy = positions[i].y - positions[i - 1].y
    cumulative += Math.sqrt(dx * dx + dy * dy)
    lengths.push(cumulative)
  }

  return lengths
}
