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

type GradingId = 'encouraging' | 'balanced' | 'strict';

interface GradingOption {
  id: GradingId;
  title: string;
  description: string;
}

const OPTIONS: GradingOption[] = [
  {
    id: 'encouraging',
    title: 'Encouraging',
    description: 'Credit for trying, focus on what went well.',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: 'Honest feedback, clear on what to improve.',
  },
  {
    id: 'strict',
    title: 'Strict',
    description: "Hold me to a high standard. Don't let me off easy. (Bonus XP)",
  },
];

export default function GradingModeScreen({ onContinue, onBack, progress }: OnboardingScreenProps) {
  const [selected, setSelected] = useState<GradingId>('balanced');
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
          <QuestionHeader question="How strict should I be?" fontSize={20} />
        </View>

        <View style={styles.list}>
          {OPTIONS.map((option) => (
            <SelectableCard
              key={option.id}
              selected={selected === option.id}
              onSelect={() => setSelected(option.id)}
              title={option.title}
              description={option.description}
              cardStyle={styles.cardPadding}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <InkButton label="CONTINUE" textColor={colors.canvas} onPress={() => onContinue?.()} />
        <Text style={styles.footerCaption}>This helps me decide how to evaluate your work.</Text>
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
  list: {
    gap: spacing.md,
  },
  cardPadding: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
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
