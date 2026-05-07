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

type CookingFrequencyId = 'rarely' | 'sometimes' | 'often' | 'daily';

interface FrequencyOption {
  id: CookingFrequencyId;
  title: string;
  description: string;
}

const OPTIONS: FrequencyOption[] = [
  {
    id: 'rarely',
    title: 'Rarely',
    description: 'I do not cook for myself or I eat out primarly.',
  },
  {
    id: 'sometimes',
    title: 'Sometimes',
    description: 'I cook 1–2 times a week, usually when I have extra time.',
  },
  {
    id: 'often',
    title: 'Often',
    description: "I meal prep or cook 3\u20135 nights a week. It's a regular part of my routine.",
  },
  {
    id: 'daily',
    title: 'Daily',
    description: "I'm at the stove every day. Cooking is my primary way of fueling myself and/or others.",
  },
];

export default function CookingFrequencyScreen({ onContinue, onBack, progress }: OnboardingScreenProps) {
  const [selected, setSelected] = useState<CookingFrequencyId>('sometimes');
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
          <QuestionHeader question="How often do you cook currently?" fontSize={20} />
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
        <Text style={styles.footerCaption}>This helps me decide how to structure lessons.</Text>
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
