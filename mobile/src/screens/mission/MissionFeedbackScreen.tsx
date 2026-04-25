import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import InkCard from '../../components/ui/InkCard'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing, radius, blockShadow } from '../../theme'

interface CriterionResult {
  name: string
  stars: number
  comment?: string
}

interface FeedbackPayload {
  overall_stars: number
  criteria: CriterionResult[]
  comment: string
  xp_earned?: number
}

function StarRow({ stars, max = 5 }: { stars: number; max?: number }) {
  return (
    <View style={starStyles.row}>
      {Array.from({ length: max }).map((_, i) => (
        <Text key={i} style={[starStyles.star, i < stars && starStyles.starFilled]}>
          ★
        </Text>
      ))}
    </View>
  )
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 18, color: colors.paperShadow },
  starFilled: { color: colors.amber },
})

export default function MissionFeedbackScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets()
  const { mission, feedback } = route.params

  const fb: FeedbackPayload | null = feedback ?? null
  const overallStars = fb?.overall_stars ?? 3
  const criteria: CriterionResult[] = fb?.criteria ?? []
  const comment = fb?.comment ?? 'Nice work putting your skills into practice!'
  const xpEarned = fb?.xp_earned ?? overallStars * 20
  const passed = overallStars >= 3

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot */}
        <View style={styles.mascotRow}>
          <MonkeyMascot size={80} />
        </View>

        {/* Headline */}
        <Text style={styles.headline}>{passed ? 'Mission Complete.' : 'Good Effort.'}</Text>
        <Text style={styles.subhead}>{mission?.title}</Text>

        {/* Overall stars card */}
        <InkCard
          shadow="amber"
          backgroundColor={passed ? colors.amber : colors.surface}
          style={styles.overallCard}
        >
          <Text style={styles.overallLabel}>OVERALL SCORE</Text>
          <StarRow stars={overallStars} />
          <Text style={styles.overallScore}>{overallStars}/5 stars</Text>
        </InkCard>

        {/* XP badge */}
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>+{xpEarned} XP earned</Text>
        </View>

        {/* Mascot comment */}
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>"{comment}"</Text>
        </View>

        {/* Criterion breakdown */}
        {criteria.length > 0 && (
          <View style={styles.criteriaSection}>
            <Text style={styles.sectionLabel}>BREAKDOWN</Text>
            {criteria.map((c, i) => (
              <View key={i} style={[styles.criterionRow, blockShadow.paper]}>
                <View style={styles.criterionHeader}>
                  <Text style={styles.criterionName}>{c.name}</Text>
                  <StarRow stars={c.stars} />
                </View>
                {c.comment ? (
                  <Text style={styles.criterionComment}>{c.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton
          label="Back to Kitchen →"
          onPress={() =>
            navigation.reset({
              index: 1,
              routes: [{ name: 'MainTabs' }, { name: 'MainTabs', params: { screen: 'Kitchen' } }],
            })
          }
        />
        <InkButton
          label="Go to Trail"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
          variant="ghost"
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </GridBackground>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  mascotRow: {
    marginBottom: -spacing.sm,
  },
  headline: {
    fontFamily: typography.headlineBold,
    fontSize: 32,
    color: colors.ink,
    textAlign: 'center',
  },
  subhead: {
    fontFamily: typography.headlineItalic,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  overallCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  overallLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  overallScore: {
    fontFamily: typography.headlineBold,
    fontSize: 18,
    color: colors.ink,
  },
  xpBadge: {
    borderWidth: 1.5,
    borderColor: colors.amber,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    marginTop: -spacing.sm,
  },
  xpText: {
    fontFamily: typography.labelBold,
    fontSize: 13,
    color: colors.amber,
  },
  bubble: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  bubbleText: {
    fontFamily: typography.headlineItalic,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  criteriaSection: {
    width: '100%',
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.inkSoft,
  },
  criterionRow: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  criterionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criterionName: {
    fontFamily: typography.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  criterionComment: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
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
