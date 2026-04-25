import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { colors, radius, blockShadow } from '../../theme'

type ShadowVariant = 'ink' | 'paper' | 'amber' | 'none'
type BorderVariant = 'solid' | 'dashed' | 'none'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
  shadow?: ShadowVariant
  border?: BorderVariant
  selected?: boolean  // shorthand: dashed border + amber shadow
  backgroundColor?: string
  padding?: number
}

export default function InkCard({
  children,
  style,
  shadow = 'paper',
  border = 'solid',
  selected = false,
  backgroundColor,
  padding = 16,
}: Props) {
  const resolvedBorder: BorderVariant = selected ? 'dashed' : border
  const resolvedShadow: ShadowVariant = selected ? 'amber' : shadow
  const resolvedBg = backgroundColor ?? colors.surface

  return (
    <View
      style={[
        styles.base,
        { padding, backgroundColor: resolvedBg, borderRadius: radius.sm },
        resolvedBorder === 'solid' && styles.borderSolid,
        resolvedBorder === 'dashed' && styles.borderDashed,
        resolvedShadow !== 'none' && blockShadow[resolvedShadow === 'none' ? 'paper' : resolvedShadow],
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
  },
  borderSolid: {
    borderStyle: 'solid',
    borderColor: colors.ink,
  },
  borderDashed: {
    borderStyle: 'dashed',
    borderColor: colors.ink,
  },
})
