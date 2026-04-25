import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import { colors, typography, spacing, radius } from '../../theme'

export default function RecipeIngredientsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets()
  const { lessonData } = route.params
  const ingredients: { name: string; amount: string; unit: string }[] = lessonData?.ingredient_list ?? []
  const steps = lessonData?.steps ?? []

  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.stepLabel}>BEFORE YOU COOK</Text>
          <Text style={styles.title}>Gather your mise en place.</Text>
          <Text style={styles.subtitle}>Check off each ingredient as you prep it.</Text>
        </View>

        {/* Ingredient list */}
        <View style={styles.list}>
          {ingredients.map((ing, i) => {
            const done = checked.has(i)
            return (
              <TouchableOpacity
                key={i}
                onPress={() => toggle(i)}
                activeOpacity={0.8}
                style={[styles.item, done && styles.itemDone]}
              >
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.itemText, done && styles.itemTextDone]}>
                  <Text style={styles.amount}>{ing.amount} {ing.unit} </Text>
                  {ing.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Warning callout */}
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠️ Read all steps before you start cooking. Mise en place first — every time.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton
          label="Start Cooking →"
          onPress={() =>
            navigation.navigate('RecipeStep', {
              ...route.params,
              stepIndex: 0,
            })
          }
        />
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  stepLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  title: {
    fontFamily: typography.headlineBold,
    fontSize: 24,
    color: colors.ink,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  list: {
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.paperShadow,
  },
  itemDone: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.ink,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontFamily: typography.labelBold,
  },
  itemText: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  itemTextDone: {
    textDecorationLine: 'line-through',
    color: colors.inkSoft,
  },
  amount: {
    fontFamily: typography.bodyBold,
  },
  warning: {
    borderWidth: 2,
    borderColor: colors.amber,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  warningText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
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
})
