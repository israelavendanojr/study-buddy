import React, { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import InkCard from '../../components/ui/InkCard'
import MonkeyMascot from '../../components/MonkeyMascot'
import { generateLesson } from '../../api/client'
import { colors, typography, spacing } from '../../theme'

export default function RecipeIntroScreen({ navigation, route }: any) {
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  const { lessonKey, lessonTitle, chapterTitle, goal, experience } = route.params
  const [lessonData, setLessonData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await generateLesson({
          user_id: user?.id ?? '',
          lesson_key: lessonKey,
          lesson_title: lessonTitle,
          chapter_title: chapterTitle,
          goal,
          buddy_name: 'Pepper',
          experience,
          lesson_type: 'recipe',
        })
        setLessonData(data)
      } catch (e) {
        console.error('[RecipeIntro]', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lessonKey])

  if (loading) {
    return (
      <GridBackground style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={styles.loadingText}>Preparing the recipe...</Text>
      </GridBackground>
    )
  }

  const hook = lessonData?.card1 ?? {}
  const techniques = lessonData?.techniques ?? []

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <InkCard shadow="ink" style={styles.heroCard}>
          <Text style={styles.recipeLabel}>RECIPE CHALLENGE</Text>
          <Text style={styles.recipeTitle}>{lessonTitle}</Text>
          <Text style={styles.recipeDesc}>{hook.motivation ?? "Put everything you\u2019ve learned into practice."}</Text>
        </InkCard>

        {/* Skills used */}
        {techniques.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SKILLS YOU'LL USE</Text>
            <View style={styles.chips}>
              {techniques.map((t: string, i: number) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pepper's advice */}
        <View style={styles.mascotRow}>
          <MonkeyMascot size={60} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              "Read all the steps before you start. Mise en place first — every time."
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton
          label="See Ingredients →"
          onPress={() =>
            navigation.navigate('RecipeIngredients', { lessonData, lessonKey, ...route.params })
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
  loadingText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: spacing.md,
  },
  heroCard: {
    gap: spacing.sm,
  },
  recipeLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  recipeTitle: {
    fontFamily: typography.headlineBold,
    fontSize: 26,
    color: colors.ink,
    lineHeight: 32,
  },
  recipeDesc: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 21,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: typography.labelMedium,
    fontSize: 12,
    color: colors.ink,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bubble: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  bubbleText: {
    fontFamily: typography.headlineItalic,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
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
