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

function FrequencyCard({
  option,
  selected,
  onSelect,
}: {
  option: FrequencyOption;
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
          { paddingTop: insets.top + 52 + spacing.md, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <QuestionHeader question="How often do you cook currently?" fontSize={20} />
        </View>

        <View style={styles.list}>
          {OPTIONS.map((option) => (
            <FrequencyCard
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
