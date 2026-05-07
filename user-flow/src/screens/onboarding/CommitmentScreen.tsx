import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import QuestionHeader from '../../components/QuestionHeader';
import SelectableCard from '../../components/SelectableCard';
import { colors, fonts, spacing } from '../../theme';
import { ONBOARDING_PROGRESS_BAR_HEIGHT, OnboardingScreenProps } from './types';

type CommitmentId = '5' | '10' | '20' | '30';

interface CommitmentOption {
  id: CommitmentId;
  label: string;
}

const OPTIONS: CommitmentOption[] = [
  { id: '5',  label: '5 MINS' },
  { id: '10', label: '10 MINS' },
  { id: '20', label: '20 MINS' },
  { id: '30', label: '30 MINS' },
];

function CommitmentCard({
  option,
  selected,
  onSelect,
}: {
  option: CommitmentOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <SelectableCard
      selected={selected}
      onSelect={onSelect}
      style={styles.cardWrapper}
      cardStyle={styles.card}
    >
      <MaterialIcons
        name="timer"
        size={28}
        color={selected ? colors.amber : colors.onSurfaceVariant}
      />
      <Text style={[styles.minsText, selected && styles.minsTextSelected]}>
        {option.label}
      </Text>
      <Text style={[styles.perDayText, selected && styles.perDayTextSelected]}>
        PER DAY
      </Text>
    </SelectableCard>
  );
}

export default function CommitmentScreen({ onContinue, onBack, progress }: OnboardingScreenProps) {
  const [selected, setSelected] = useState<CommitmentId>('10');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <GridBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + ONBOARDING_PROGRESS_BAR_HEIGHT + spacing.md, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <QuestionHeader question="What's your daily learning goal?" fontSize={20} />
        </View>

        <View style={styles.grid}>
          {OPTIONS.map((option) => (
            <View key={option.id} style={styles.gridItem}>
              <CommitmentCard
                option={option}
                selected={selected === option.id}
                onSelect={() => setSelected(option.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <InkButton label="CONTINUE" textColor={colors.canvas} onPress={() => onContinue?.()} />
        <Text style={styles.footerCaption}>I'll use this to keep your daily roadmap achievable.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  headerWrapper: {
    marginBottom: spacing.lg,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md + 4,
  },

  // Card wrapper (aspect ratio lives here)
  cardWrapper: {
    aspectRatio: 1,
  },

  // Card face — centered layout overrides SelectableCard defaults
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card content
  minsText: {
    fontFamily: fonts.headline,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
  },
  minsTextSelected: {
    color: colors.amberDark,
  },
  perDayText: {
    fontFamily: fonts.label,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },
  perDayTextSelected: {
    color: colors.amberDark,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(251,246,230,0.94)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  footerCaption: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(26,26,26,0.6)',
    textAlign: 'center',
  },
});
