import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing, radius, blockShadow } from '../../theme'

interface Item {
  key: string
  label: string
  originalIndex: number
}

interface Props {
  progressBar: React.ReactNode
  activityId: string
  prompt: string
  steps: string[]
  correctOrder: number[]
  onDone: (passed: boolean) => void
}

export default function SequenceScreen({ progressBar, prompt, steps, correctOrder, onDone }: Props) {
  const insets = useSafeAreaInsets()

  const [items, setItems] = useState<Item[]>(() =>
    // Shuffle on mount
    [...steps.map((s, i) => ({ key: String(i), label: s, originalIndex: i }))]
      .sort(() => Math.random() - 0.5)
  )
  const [checked, setChecked] = useState(false)
  const [passed, setPassed] = useState(false)

  function handleCheck() {
    // Compare user order to correct order
    const userOrder = items.map((item) => item.originalIndex)
    const isCorrect = correctOrder.length > 0
      ? correctOrder.every((v, i) => v === userOrder[i])
      : true // if no correct order provided, always pass
    setPassed(isCorrect)
    setChecked(true)
  }

  function renderItem({ item, drag, isActive }: RenderItemParams<Item>) {
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.row,
            isActive && styles.rowActive,
            !isActive && blockShadow.paper,
          ]}
          onTouchStart={drag} // simplified drag trigger
        >
          <Text style={styles.dragHandle}>≡</Text>
          <View style={styles.numBadge}>
            <Text style={styles.numText}>{items.indexOf(item) + 1}</Text>
          </View>
          <Text style={styles.stepText}>{item.label}</Text>
        </View>
      </ScaleDecorator>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GridBackground style={{ flex: 1 }}>
        {progressBar}

        {/* Mascot + prompt */}
        <View style={styles.header}>
          <MonkeyMascot size={52} />
          <View style={styles.bubble}>
            <Text style={styles.promptText}>{prompt || 'Put these steps in the correct order.'}</Text>
          </View>
        </View>

        {/* Draggable list */}
        <DraggableFlatList
          data={items}
          keyExtractor={(item) => item.key}
          onDragEnd={({ data }) => setItems(data)}
          renderItem={renderItem}
          containerStyle={styles.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: spacing.xl }}
          scrollEnabled={false}
        />

        {/* Result feedback */}
        {checked && (
          <View style={[styles.result, passed ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultText}>
              {passed ? '✓ Correct order!' : '✗ Not quite. Review the order above.'}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {!checked ? (
            <View style={styles.footerRow}>
              <InkButton
                label="Skip"
                onPress={() => onDone(false)}
                variant="ghost"
                fullWidth={false}
                style={styles.skipBtn}
              />
              <InkButton
                label="Check →"
                onPress={handleCheck}
                fullWidth={false}
                style={styles.checkBtn}
              />
            </View>
          ) : (
            <InkButton label="Continue →" onPress={() => onDone(passed)} />
          )}
        </View>
      </GridBackground>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  bubble: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  promptText: {
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowActive: {
    backgroundColor: colors.amber + '18',
    borderStyle: 'dashed',
    ...blockShadow.amber,
  },
  dragHandle: {
    fontFamily: typography.labelBold,
    fontSize: 20,
    color: colors.inkSoft,
    paddingRight: 4,
  },
  numBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  numText: {
    fontFamily: typography.labelBold,
    fontSize: 12,
    color: colors.ink,
  },
  stepText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    lineHeight: 20,
  },
  result: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  resultCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  resultWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  resultText: {
    fontFamily: typography.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: { flex: 1 },
  checkBtn: { flex: 2 },
})
