import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import RecipeHeader, { RECIPE_HEADER_HEIGHT } from '../../components/RecipeHeader';
import RecipeStepIndicator from '../../components/RecipeStepIndicator';
import { colors, fonts, spacing } from '../../theme';
import { RecipeStepContent } from '../../types/recipe';

interface RecipeStepScreenProps {
  content: RecipeStepContent;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

type OptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed';

export default function RecipeStepScreen({ content, onNext, onBack, onClose }: RecipeStepScreenProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const { checkpoint } = content;

  const handleCheck = () => {
    if (selected !== null) setChecked(true);
  };

  const handleSkip = () => {
    setSkipped(true);
  };

  // Determine option style state after checking
  const getOptionState = (i: number): OptionState => {
    if (!checked) return selected === i ? 'selected' : 'default';
    if (i === checkpoint?.correctIndex) return 'correct';
    if (i === selected && selected !== checkpoint?.correctIndex) return 'wrong';
    return 'dimmed';
  };

  return (
    <View style={styles.root}>
      <GridBackground />

      <RecipeHeader
        title="RECIPE CHALLENGE"
        timeMinutes={content.timeMinutes}
        onLeft={onBack}
        variant="back"
      />

      <View style={{ flex: 1, paddingTop: RECIPE_HEADER_HEIGHT + insets.top }}>
        <RecipeStepIndicator stepCount={content.stepCount} currentStep={content.stepNumber} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 88 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Step badge + title */}
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP {content.stepNumber}</Text>
            </View>
            <Text style={styles.title}>{content.title}</Text>
          </View>

          {/* Instruction card */}
          <View style={styles.cardShadowWrap}>
            <View style={styles.cardShadow} />
            <View style={styles.card}>
              <View style={styles.accentBar} />
              <View style={styles.cardInner}>
                <Text style={styles.instruction}>{content.instruction}</Text>

                {content.whatToLookFor && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.lookForLabel}>WHAT TO LOOK FOR</Text>
                    <Text style={styles.lookForText}>{content.whatToLookFor}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Suggested time */}
          {content.suggestedTime && (
            <View style={styles.timeCard}>
              <MaterialIcons name="timer" size={36} color={colors.ink} />
              <View>
                <Text style={styles.timeLabel}>SUGGESTED TIME</Text>
                <Text style={styles.timeValue}>{content.suggestedTime}</Text>
              </View>
            </View>
          )}

          {/* No checkpoint note */}
          {!checkpoint && (
            <Text style={styles.noCheckpointNote}>
              No checkpoint here — this is pure execution. Just do it right.
            </Text>
          )}

          {/* Checkpoint */}
          {checkpoint && !skipped && (
            <View style={styles.checkpointShadowWrap}>
              <View style={styles.checkpointShadow} />
              <View style={styles.checkpointCard}>
                <View style={styles.checkpointBadge}>
                  <Text style={styles.checkpointBadgeText}>CHECKPOINT</Text>
                </View>
                <Text style={styles.checkpointQuestion}>{checkpoint.question}</Text>

                <View style={styles.options}>
                  {checkpoint.options.map((option, i) => {
                    const state = getOptionState(i);
                    return (
                      <Pressable
                        key={i}
                        style={[styles.option, optionBorderStyle(state)]}
                        onPress={() => !checked && setSelected(i)}
                        disabled={checked}
                      >
                        <View style={[styles.optionBadge, optionBadgeStyle(state)]}>
                          {state === 'correct' ? (
                            <MaterialIcons name="check" size={14} color={colors.white} />
                          ) : (
                            <Text style={styles.optionLetter}>{OPTION_LETTERS[i]}</Text>
                          )}
                        </View>
                        <Text style={[styles.optionText, state === 'dimmed' && styles.optionTextDimmed]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Inline action row */}
                {!checked && (
                  <View style={styles.actionRow}>
                    <Pressable style={styles.skipButton} onPress={handleSkip}>
                      <MaterialIcons name="fast-forward" size={16} color={colors.ink} />
                      <Text style={styles.skipLabel}>SKIP</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.checkButton, selected === null && styles.checkButtonDisabled]}
                      onPress={handleCheck}
                    >
                      <MaterialIcons name="check-circle" size={16} color={colors.white} />
                      <Text style={styles.checkLabel}>CHECK ANSWER</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sticky footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <InkButton label="STEP DONE · NEXT →" onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

function optionBorderStyle(state: OptionState) {
  switch (state) {
    case 'selected': return styles.optionSelected;
    case 'correct':  return styles.optionCorrect;
    case 'wrong':    return styles.optionWrong;
    default:         return undefined;
  }
}

function optionBadgeStyle(state: OptionState) {
  switch (state) {
    case 'selected': return styles.optionBadgeSelected;
    case 'correct':  return styles.optionBadgeCorrect;
    case 'wrong':    return styles.optionBadgeWrong;
    default:         return undefined;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },

  // Step header
  stepHeader: {
    gap: spacing.sm,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  stepBadgeText: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.white,
  },
  title: {
    fontFamily: fonts.headline,
    fontSize: 36,
    lineHeight: 40,
    color: colors.ink,
  },

  // Instruction card
  cardShadowWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    backgroundColor: colors.amber,
    marginVertical: spacing.sm,
    marginLeft: spacing.sm,
    borderRadius: 2,
  },
  cardInner: {
    flex: 1,
    padding: spacing.lg,
  },
  instruction: {
    fontFamily: fonts.body,
    fontSize: 19,
    lineHeight: 30,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.ink,
    opacity: 0.15,
    marginVertical: spacing.lg,
  },
  lookForLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 2.5,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  lookForText: {
    fontFamily: fonts.headlineItalic,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },

  // Suggested time
  timeCard: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.ink,
    opacity: 0.6,
    marginBottom: 2,
  },
  timeValue: {
    fontFamily: fonts.headline,
    fontSize: 28,
    lineHeight: 32,
    color: colors.amber,
  },

  // No checkpoint note
  noCheckpointNote: {
    fontFamily: fonts.headlineItalic,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: spacing.lg,
  },

  // Checkpoint card
  checkpointShadowWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  checkpointShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  checkpointCard: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: spacing.lg,
    gap: spacing.md,
  },
  checkpointBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  checkpointBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.white,
  },
  checkpointQuestion: {
    fontFamily: fonts.headlineItalic,
    fontSize: 22,
    lineHeight: 30,
    color: colors.ink,
  },

  // Options
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: spacing.md,
  },
  optionSelected: {
    borderStyle: 'dashed',
    borderColor: colors.amber,
  },
  optionCorrect: {
    borderColor: colors.amber,
  },
  optionWrong: {
    borderStyle: 'dashed',
    borderColor: '#BA1A1A',
  },
  optionBadge: {
    width: 36,
    height: 36,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionBadgeSelected: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  optionBadgeCorrect: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  optionBadgeWrong: {
    backgroundColor: '#BA1A1A',
    borderColor: '#BA1A1A',
  },
  optionLetter: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.white,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  optionTextDimmed: {
    opacity: 0.4,
  },

  // Inline action row
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: spacing.md,
    opacity: 0.9,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    paddingVertical: spacing.sm + 2,
  },
  skipLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.ink,
  },
  checkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.amberDark,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingVertical: spacing.sm + 2,
  },
  checkButtonDisabled: {
    opacity: 0.4,
  },
  checkLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.white,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.grid,
  },
});
