import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import GridBackground from '../../components/GridBackground';
import { colors, fonts, spacing } from '../../theme';

const HEADER_HEIGHT = 56;

interface MissionData {
  id: string;
  title: string;
  subtitle: string;
}

interface SubmissionData {
  id: string;
  title: string;
  stars: number;
  timeAgo: string;
}

interface CompletedData {
  id: string;
  title: string;
  feedback: string;
  date: string;
}

const ACTIVE_MISSIONS: MissionData[] = [
  { id: 'dice-onion',    title: 'Dice an Onion',  subtitle: 'Knife Skills — Lesson 2' },
  { id: 'sear-chicken',  title: 'Sear Chicken',   subtitle: 'Searing — Lesson 1' },
];

const SUBMISSIONS: SubmissionData[] = [
  { id: 'mushrooms',  title: 'Sautéed Mushrooms', stars: 0, timeAgo: '2 days ago' },
  { id: 'omelette',   title: 'Classic Omelette',  stars: 0, timeAgo: '5 days ago' },
];

const COMPLETED: CompletedData[] = [
  { id: 'pan-sauce', title: 'Pan Sauce', feedback: 'Nice work!', date: 'Jul 12' },
];

function SectionLabel({ label, amber = true }: { label: string; amber?: boolean }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[styles.sectionLabel, { color: amber ? colors.amber : colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
  );
}

function MissionCard({ mission }: { mission: MissionData }) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const onPressIn = () => Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  const onPressOut = () => Animated.timing(pressAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();

  const translate = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const shadowOpacity = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={styles.missionCardOuter}>
      <View style={styles.missionCardShadow} />
      <View style={styles.missionCardFace}>
        {/* Text with camera icon */}
        <View style={styles.missionTextCol}>
          <View style={styles.missionTitleRow}>
            <MaterialIcons name="photo-camera" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.missionTitle}>{mission.title}</Text>
          </View>
          <Text style={styles.missionSubtitle}>{mission.subtitle}</Text>
        </View>

        {/* Start button */}
        <View style={styles.startBtnOuter}>
          <Animated.View style={[styles.startBtnShadow, { opacity: shadowOpacity }]} />
          <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
            <Animated.View style={[styles.startBtnFace, { transform: [{ translateX: translate }, { translateY: translate }] }]}>
              <Text style={styles.startBtnLabel}>START MISSION</Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StarRow({ count, filled }: { count: number; filled: number }) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: count }).map((_, i) => (
        <MaterialIcons
          key={i}
          name={i < filled ? 'star' : 'star-outline'}
          size={14}
          color={colors.amber}
        />
      ))}
    </View>
  );
}

function SubmissionCard({ submission }: { submission: SubmissionData }) {
  return (
    <View style={styles.submissionCardOuter}>
      <View style={styles.submissionCardShadow} />
      <View style={styles.submissionCardFace}>
        {/* Image placeholder */}
        <View style={styles.submissionImagePlaceholder}>
          <MaterialIcons name="image" size={36} color={colors.surfaceVariant} />
        </View>
        {/* Info */}
        <View style={styles.submissionInfo}>
          <Text style={styles.submissionTitle}>{submission.title}</Text>
          <StarRow count={5} filled={submission.stars} />
          <Text style={styles.submissionTimeAgo}>{submission.timeAgo}</Text>
        </View>
      </View>
    </View>
  );
}

function CompletedItem({ item }: { item: CompletedData }) {
  return (
    <View style={styles.completedCardOuter}>
      <View style={styles.completedCardShadow} />
      <View style={styles.completedCardFace}>
        {/* Check icon box */}
        <View style={styles.completedIconBox}>
          <MaterialIcons name="check-circle" size={24} color={colors.onSurfaceVariant} />
        </View>
        {/* Text */}
        <View style={styles.completedTextCol}>
          <Text style={styles.completedTitle}>{item.title}</Text>
          <Text style={styles.completedSubtitle}>{item.feedback} • {item.date}</Text>
        </View>
        {/* More */}
        <MaterialIcons name="more-vert" size={20} color={colors.onSurfaceVariant} style={styles.completedMore} />
      </View>
    </View>
  );
}

export default function KitchenScreen({
  paddingTop,
  paddingBottom,
}: {
  paddingTop: number;
  paddingBottom: number;
}) {
  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Header */}
      <View style={[styles.header, { height: HEADER_HEIGHT + paddingTop, paddingTop }]}>
        <Text style={styles.headerTitle}>KITCHEN</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: paddingTop + HEADER_HEIGHT + spacing.lg,
          paddingBottom: paddingBottom + spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ACTIVE MISSIONS */}
        <SectionLabel label="ACTIVE MISSIONS" />
        {ACTIVE_MISSIONS.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}

        {/* MY SUBMISSIONS */}
        <View style={styles.sectionGap} />
        <SectionLabel label="MY SUBMISSIONS" />
        <View style={styles.submissionsGrid}>
          {SUBMISSIONS.map((s) => (
            <SubmissionCard key={s.id} submission={s} />
          ))}
        </View>
        <Pressable style={styles.viewAllRow}>
          <Text style={styles.viewAllLabel}>VIEW ALL SUBMISSIONS →</Text>
        </Pressable>

        {/* COMPLETED */}
        <View style={styles.sectionGap} />
        <SectionLabel label="COMPLETED" amber={false} />
        {COMPLETED.map((c) => (
          <CompletedItem key={c.id} item={c} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  // Header
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  headerTitle: {
    fontFamily: fonts.label,
    fontSize: 16,
    letterSpacing: 4,
    color: colors.ink,
    textTransform: 'uppercase',
  },

  scrollView: {
    flex: 1,
  },

  // Section label
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionGap: {
    height: spacing.xl,
  },

  // Mission card
  missionCardOuter: {
    paddingBottom: 4,
    paddingRight: 4,
    marginBottom: spacing.md,
  },
  missionCardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.grid,
  },
  missionCardFace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    minHeight: 80,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  missionTextCol: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  missionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionTitle: {
    fontFamily: fonts.headline,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
  },
  missionSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Start button
  startBtnOuter: {
    paddingBottom: 3,
    paddingRight: 3,
    marginRight: spacing.sm,
  },
  startBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  startBtnFace: {
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  startBtnLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.white,
  },

  // Submissions grid
  submissionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  submissionCardOuter: {
    flex: 1,
    paddingBottom: 4,
    paddingRight: 4,
  },
  submissionCardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.grid,
  },
  submissionCardFace: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  submissionImagePlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  submissionInfo: {
    padding: spacing.sm,
    gap: 4,
  },
  submissionTitle: {
    fontFamily: fonts.headline,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  starRow: {
    flexDirection: 'row',
    gap: 1,
  },
  submissionTimeAgo: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // View all
  viewAllRow: {
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  viewAllLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amber,
    textTransform: 'uppercase',
  },

  // Completed items
  completedCardOuter: {
    paddingBottom: 4,
    paddingRight: 4,
    marginBottom: spacing.sm,
  },
  completedCardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.grid,
  },
  completedCardFace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    minHeight: 64,
  },
  completedIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  completedTextCol: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  completedTitle: {
    fontFamily: fonts.headline,
    fontSize: 15,
    color: colors.ink,
    opacity: 0.6,
  },
  completedSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    opacity: 0.8,
  },
  completedMore: {
    marginRight: spacing.sm,
    opacity: 0.5,
  },
});
