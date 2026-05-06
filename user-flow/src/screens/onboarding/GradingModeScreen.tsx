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

function GradingCard({
  option,
  selected,
  onSelect,
}: {
  option: GradingOption;
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
          { paddingTop: insets.top + 52 + spacing.md, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <QuestionHeader question="How strict should I be?" fontSize={20} />
        </View>

        <View style={styles.list}>
          {OPTIONS.map((option) => (
            <GradingCard
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
