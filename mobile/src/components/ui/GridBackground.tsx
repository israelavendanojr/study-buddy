import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg'
import { colors, GRID_SIZE } from '../../theme'

interface Props {
  style?: ViewStyle
  children?: React.ReactNode
}

export default function GridBackground({ style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
      {/* SVG dot grid overlay */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="grid"
            x="0"
            y="0"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="0.5" cy="0.5" r="0.75" fill={colors.paperShadow} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
      </Svg>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})
