import React from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors } from '../theme'

const { width: SW } = Dimensions.get('window')

interface PathTrailProps {
  pathD: string
  totalHeight: number
  progressLength: number
  totalLength: number
}

function PathTrailInner({ pathD, totalHeight, progressLength, totalLength }: PathTrailProps) {
  if (!pathD) return null

  return (
    <Svg
      width={SW}
      height={totalHeight}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Background trail */}
      <Path
        d={pathD}
        stroke={colors.border}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Progress trail (mint, up to active node) */}
      <Path
        d={pathD}
        stroke={colors.mint}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${progressLength}, ${totalLength}`}
      />
    </Svg>
  )
}

export default React.memo(PathTrailInner)
