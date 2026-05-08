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
import SkipButton from '../../components/SkipButton';
import { borderRadius, colors, fonts, spacing } from '../../theme';
import { MultipleChoiceData } from '../../types/lesson';

interface MultipleChoiceScreenProps {
  onNext: () => void;
  onSkip: () => void;
  question: MultipleChoiceData;
}

type Option = MultipleChoiceData['options'][number];

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: Option;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <PressableCard
      onPress={onSelect}
      selected={selected}
      cardStyle={[styles.optionCard, selected ? styles.optionCardSelected : styles.optionCardActive]}
    >
      {/* Checkmark badge */}
      {selected && (
        <View style={styles.checkBadge}>
          <MaterialIcons name="check" size={16} color={colors.white} />
        </View>
      )}

      {/* Letter badge */}
      <View style={[styles.letterBadge, selected && styles.letterBadgeSelected]}>
        <Text style={[styles.letterText, selected && styles.letterTextSelected]}>
          {option.id}
        </Text>
      </View>

      {/* Option text */}
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {option.text}
      </Text>
    </PressableCard>
  );
}

export default function MultipleChoiceScreen({
  onNext,
  onSkip,
  question,
}: MultipleChoiceScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Spacer for overlay progress bar */}
      <View style={{ height: insets.top + 52 }} />

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <QuestionHeader question={question.text} />

        {/* Options list */}
        <View style={styles.optionsList}>
          {question.options.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={selectedId === option.id}
              onSelect={() => setSelectedId(option.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <SkipButton onPress={onSkip} />
        <View style={[styles.checkButtonWrapper, !selectedId && styles.checkButtonDisabled]}>
          <InkButton
            label="CHECK"
            onPress={selectedId ? onNext : undefined}
            disabled={!selectedId}
          />
        </View>
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
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },

  // Options list
  optionsList: {
    gap: 14,
  },

  // Option card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.md,
    position: 'relative',
  },
  optionCardActive: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'solid',
  },
  optionCardSelected: {
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

  // Letter badge
  letterBadge: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letterBadgeSelected: {
    backgroundColor: colors.amber,
    borderWidth: 0,
  },
  letterText: {
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.ink,
  },
  letterTextSelected: {
    color: colors.white,
  },

  // Option text
  optionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.amberDark,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.canvasAlt,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },

  // Check button
  checkButtonWrapper: {
    flex: 1,
  },
  checkButtonDisabled: {
    opacity: 0.4,
  },
});
