import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, typography, spacing } from '../../theme'

interface Props {
  current: number   // 1-based current step
  total: number     // total steps
  label?: string    // e.g. "LESSON 2 OF 5"
  onClose?: () => void
}

export default function LessonProgressBar({ current, total, label, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const progress = total > 0 ? Math.min(current / total, 1) : 0

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <Text style={styles.label}>{label ?? `STEP ${current} OF ${total}`}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Progress track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: typography.labelBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 4,
  },
  closeX: {
    fontFamily: typography.labelBold,
    fontSize: 14,
    color: colors.ink,
  },
  track: {
    height: 6,
    backgroundColor: colors.paperShadow,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.amber,
  },
})
