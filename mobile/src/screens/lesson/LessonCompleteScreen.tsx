import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GridBackground from '../../components/ui/GridBackground'
import InkButton from '../../components/ui/InkButton'
import InkCard from '../../components/ui/InkCard'
import MonkeyMascot from '../../components/MonkeyMascot'
import { colors, typography, spacing, blockShadow, radius } from '../../theme'

interface Props {
  navigation: any
  route: {
    params: {
      lessonTitle: string
      xpEarned: number
      timeLabel: string
      accuracy: number
      missionCreated?: { id: number; title: string; description: string } | null
      globalIndex: number
    }
  }
}

export default function LessonCompleteScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets()
  const { lessonTitle, xpEarned, timeLabel, accuracy, missionCreated } = route.params

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot */}
        <View style={styles.mascotRow}>
          <MonkeyMascot size={100} />
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Lesson Complete.</Text>
        <Text style={styles.subhead}>{lessonTitle}</Text>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <InkCard style={styles.statCard} shadow="amber" backgroundColor={colors.amber}>
            <Text style={styles.statValue}>+{xpEarned}</Text>
            <Text style={styles.statLabel}>XP EARNED</Text>
          </InkCard>
          <InkCard style={styles.statCard} shadow="paper">
            <Text style={styles.statValue}>{timeLabel}</Text>
            <Text style={styles.statLabel}>TIME</Text>
          </InkCard>
          <InkCard style={styles.statCard} shadow="paper">
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>ACCURACY</Text>
          </InkCard>
        </View>

        {/* Mission unlocked card */}
        {missionCreated && (
          <View style={[styles.missionCard, blockShadow.ink]}>
            <Text style={styles.missionBadge}>🍳 MISSION UNLOCKED</Text>
            <Text style={styles.missionTitle}>{missionCreated.title}</Text>
            <Text style={styles.missionDesc}>{missionCreated.description}</Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <InkButton
          label="Continue to Trail →"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
        />
        {missionCreated && (
          <InkButton
            label="Start Mission Now"
            onPress={() =>
              navigation.replace('MissionDetail', { mission: missionCreated })
            }
            variant="ghost"
            style={{ marginTop: spacing.sm }}
          />
        )}
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
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: typography.headlineBold,
    fontSize: 34,
    color: colors.ink,
    textAlign: 'center',
  },
  subhead: {
    fontFamily: typography.headlineItalic,
    fontSize: 16,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    fontFamily: typography.headlineBold,
    fontSize: 22,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: typography.labelBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.inkSoft,
    marginTop: 2,
  },
  missionCard: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  missionBadge: {
    fontFamily: typography.labelBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  missionTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  missionDesc: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
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
