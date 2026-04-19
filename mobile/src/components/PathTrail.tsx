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
      {/* Background trail (dashed gray) */}
      <Path
        d={pathD}
        stroke={colors.locked}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="4 14"
      />
      {/* Progress trail (solid amber, up to active node) */}
      {progressLength > 0 && (
        <Path
          d={pathD}
          stroke={colors.accent}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${totalLength}`}
        />
      )}
    </Svg>
  )
}

export default React.memo(PathTrailInner)
