import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native'
import { colors, typography, radius, blockShadow } from '../../theme'

type Variant = 'primary' | 'ghost' | 'danger'

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  fullWidth?: boolean
}

export default function InkButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}: Props) {
  const isPrimary = variant === 'primary'
  const isGhost = variant === 'ghost'
  const isDanger = variant === 'danger'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        isPrimary && styles.primary,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        !disabled && isPrimary && blockShadow.ink,
        !disabled && isGhost && styles.ghostShadow,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.ink} />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && styles.labelPrimary,
            isGhost && styles.labelGhost,
            isDanger && styles.labelDanger,
            disabled && styles.labelDisabled,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: colors.amber,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  danger: {
    backgroundColor: colors.error,
  },
  ghostShadow: {
    shadowColor: colors.paperShadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: typography.labelBold,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  labelPrimary: {
    color: colors.white,
  },
  labelGhost: {
    color: colors.ink,
  },
  labelDanger: {
    color: colors.white,
  },
  labelDisabled: {
    color: colors.inkSoft,
  },
})
