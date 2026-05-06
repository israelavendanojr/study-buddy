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
import PressableCard from '../../components/PressableCard';
import QuestionHeader from '../../components/QuestionHeader';
import { borderRadius, colors, fonts, spacing } from '../../theme';
import { OnboardingScreenProps } from './types';

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

function ExperienceCard({
  option,
  selected,
  onSelect,
}: {
  option: ExperienceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <PressableCard
      onPress={onSelect}
      selected={selected}
      cardStyle={[styles.card, selected ? styles.cardSelected : styles.cardActive]}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <MaterialIcons name="check" size={16} color={colors.white} />
        </View>
      )}
      <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
        {option.title}
      </Text>
      <Text style={styles.cardDescription}>{option.description}</Text>
    </PressableCard>
  );
}

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
          { paddingTop: insets.top + 52 + spacing.md, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <QuestionHeader question="What's your experience level?" fontSize={20} />
        </View>

        <View style={styles.list}>
          {OPTIONS.map((option) => (
            <ExperienceCard
              key={option.id}
              option={option}
              selected={selected === option.id}
              onSelect={() => setSelected(option.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <InkButton label="CONTINUE" textColor="#FBF6E6" onPress={() => onContinue?.()} />
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

  // List
  list: {
    gap: spacing.md,
  },

  // Card face
  card: {
    backgroundColor: colors.surfaceContainer,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    position: 'relative',
    gap: spacing.xs,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'solid',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.amberDark,
    borderStyle: 'dashed',
  },

  // Checkmark badge
  checkBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.amberDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
    zIndex: 5,
  },

  // Card text
  cardTitle: {
    fontFamily: fonts.headline,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
  },
  cardTitleSelected: {
    color: colors.amberDark,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.canvas + 'F0',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  footerCaption: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink + '99',
    textAlign: 'center',
  },
});
