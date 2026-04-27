import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import MonkeyMascot from '../../components/MonkeyMascot';
import { colors, fonts, spacing } from '../../theme';

interface LessonCompleteScreenProps {
  onContinue: () => void;
}

export default function LessonCompleteScreen({ onContinue }: LessonCompleteScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <GridBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot */}
        <View style={styles.mascotContainer}>
          <MonkeyMascot size={160} float />
        </View>

        {/* Title */}
        <Text style={styles.title}>Lesson Complete.</Text>
        <Text style={styles.subtitle}>Searing Chicken · Chapter 1</Text>

        {/* Stat rows */}
        <View style={styles.statsContainer}>
          <StatRow icon="stars" label="XP EARNED" value="+120" valueColor={colors.amber} />
          <StatRow icon="schedule" label="TIME SPENT" value="6:42" />
          <StatRow icon="adjust" label="ACCURACY" value="85%" />
        </View>

        {/* Daily streak card */}
        <View style={styles.card}>
          <View style={styles.streakRow}>
            <View style={styles.streakLeft}>
              <MaterialIcons name="local-fire-department" size={26} color={colors.amber} />
              <View>
                <Text style={styles.streakLabel}>DAILY STREAK</Text>
                <Text style={styles.streakSub}>Come back tomorrow…</Text>
              </View>
            </View>
            <Text style={styles.streakValue}>12 DAYS</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressLabel}>15 DAYS FOR NEXT BADGE</Text>
        </View>

        {/* Mission unlocked card */}
        <View style={styles.missionCard}>
          <View style={styles.missionBadge}>
            <Text style={styles.missionBadgeText}>NEW</Text>
          </View>
          <View style={styles.missionText}>
            <Text style={styles.missionTitle}>Mission Unlocked: Sear a piece of chicken</Text>
            <Text style={styles.missionDesc}>Put your theory into practice in the real world.</Text>
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.ctaContainer}>
          <InkButton label="CONTINUE TO TRAIL →" onPress={onContinue} />
          <TouchableOpacity style={styles.secondaryButton} onPress={onContinue}>
            <Text style={styles.secondaryButtonText}>START MISSION NOW</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={statStyles.row}>
      <MaterialIcons name={icon} size={22} color={colors.ink} style={statStyles.icon} />
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: -2,
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.ink,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    alignItems: 'stretch',
  },

  // Mascot
  mascotContainer: {
    alignSelf: 'center',
  },

  // Title
  title: {
    fontFamily: fonts.headlineItalic,
    fontSize: 36,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },

  // Stats
  statsContainer: {},

  // Streak card
  card: {
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    gap: spacing.sm,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  streakSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  streakValue: {
    fontFamily: fonts.headline,
    fontSize: 22,
    color: colors.amber,
  },
  progressTrack: {
    height: 14,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  progressFill: {
    width: '80%',
    height: '100%',
    backgroundColor: colors.amber,
  },
  progressLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.amber,
    letterSpacing: 0.5,
  },

  // Mission card
  missionCard: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  missionBadge: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  missionBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.5,
  },
  missionText: {
    flex: 1,
    gap: 4,
  },
  missionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  missionDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  // CTAs
  ctaContainer: {
    gap: spacing.sm,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 1,
  },
});
