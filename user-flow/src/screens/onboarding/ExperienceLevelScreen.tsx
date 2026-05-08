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

type ExperienceId = 'beginner' | 'occasional' | 'home' | 'pro';

interface ExperienceOption {
  id: ExperienceId;
  title: string;
  description: string;
}

const OPTIONS: ExperienceOption[] = [
  {
    id: 'beginner',
    title: 'Total Beginner',
    description: 'I boil water and toast bread. Starting from the ground up.',
  },
  {
    id: 'occasional',
    title: 'Occasional Cook',
    description: "I follow recipes okay, but I don't really know why things work. Slow with a knife.",
  },
  {
    id: 'home',
    title: 'Confident Home Cook',
    description:
      "I cook most nights. I'm comfortable with heat and can improvise a little. Want to polish technique.",
  },
  {
    id: 'pro',
    title: 'Kitchen Pro',
    description:
      "I've worked in industry or have years of high-level experience. Show the science.",
  },
];

export default function ExperienceLevelScreen({ onContinue, onBack, progress }: OnboardingScreenProps) {
  const [selected, setSelected] = useState<ExperienceId>('occasional');
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
          <QuestionHeader question="What's your experience level?" fontSize={20} />
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
        <Text style={styles.footerCaption}>This helps me decide which lessons to unlock first.</Text>
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
