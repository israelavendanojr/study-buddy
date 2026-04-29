import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import MonkeyMascot from '../../components/MonkeyMascot';
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
  const translateAnim = useRef(new Animated.Value(0)).current;
  const shadowOffset = selected ? 6 : 4;
  const shadowColor = selected ? colors.amberDark : colors.ink;

  const handlePressIn = () => {
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.optionWrapper}
    >
      {/* Block shadow */}
      <Animated.View
        style={[
          styles.optionShadow,
          {
            backgroundColor: shadowColor,
            top: shadowOffset,
            left: shadowOffset,
            opacity: translateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      />

      {/* Card face */}
      <Animated.View
        style={[
          styles.optionCard,
          selected ? styles.optionCardSelected : styles.optionCardActive,
          {
            transform: [
              {
                translateX: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, shadowOffset],
                }),
              },
              {
                translateY: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, shadowOffset],
                }),
              },
            ],
          },
        ]}
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
      </Animated.View>
    </Pressable>
  );
}

function SkipButton({ onPress }: { onPress: () => void }) {
  const translateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.skipWrapper}
    >
      {/* Block shadow */}
      <Animated.View
        style={[
          styles.skipShadow,
          {
            opacity: translateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      />
      {/* Button face */}
      <Animated.View
        style={[
          styles.skipButton,
          {
            transform: [
              {
                translateX: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 4],
                }),
              },
              {
                translateY: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 4],
                }),
              },
            ],
          },
        ]}
      >
        <MaterialIcons name="skip-next" size={18} color={colors.ink} />
        <Text style={styles.skipLabel}>SKIP</Text>
      </Animated.View>
    </Pressable>
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
        {/* Question row: mascot + question card */}
        <View style={styles.questionRow}>
          <MonkeyMascot size={90} />
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.text}</Text>
          </View>
        </View>

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
  header: {
    backgroundColor: colors.canvas,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },

  // Question row
  questionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  questionCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.canvasAlt,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontFamily: fonts.headlineItalic,
    fontSize: 18,
    lineHeight: 26,
    color: colors.ink,
    textAlign: 'center',
  },

  // Options list
  optionsList: {
    gap: 14,
  },

  // Option card
  optionWrapper: {
    position: 'relative',
    paddingBottom: 6,
    paddingRight: 6,
  },
  optionShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
  },
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

  // Skip button
  skipWrapper: {
    width: '35%',
    height: 56,
    position: 'relative',
  },
  skipShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  skipButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    bottom: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  skipLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.ink,
  },

  // Check button
  checkButtonWrapper: {
    flex: 1,
  },
  checkButtonDisabled: {
    opacity: 0.4,
  },
});
