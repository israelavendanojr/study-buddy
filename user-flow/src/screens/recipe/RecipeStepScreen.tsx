import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccentCard from '../../components/AccentCard';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import RecipeHeader, { RECIPE_HEADER_HEIGHT } from '../../components/RecipeHeader';
import RecipeStepIndicator from '../../components/RecipeStepIndicator';
import StepBadge from '../../components/StepBadge';
import { borderRadius, colors, fonts, spacing } from '../../theme';
import { RecipeStepContent } from '../../types/recipe';

interface RecipeStepScreenProps {
  content: RecipeStepContent;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function CheckpointOption({
  letter,
  text,
  selected,
  onSelect,
}: {
  letter: string;
  text: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const translateAnim = useRef(new Animated.Value(0)).current;
  const shadowOffset = selected ? 6 : 4;
  const shadowColor = selected ? colors.amberDark : colors.ink;

  const handlePressIn = () =>
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();

  return (
    <Pressable onPress={onSelect} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.optionWrapper}>
      <Animated.View
        style={[styles.optionShadow, {
          backgroundColor: shadowColor,
          top: shadowOffset,
          left: shadowOffset,
          opacity: translateAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        }]}
      />
      <Animated.View
        style={[
          styles.optionCard,
          selected ? styles.optionCardSelected : styles.optionCardActive,
          {
            transform: [
              { translateX: translateAnim.interpolate({ inputRange: [0, 1], outputRange: [0, shadowOffset] }) },
              { translateY: translateAnim.interpolate({ inputRange: [0, 1], outputRange: [0, shadowOffset] }) },
            ],
          },
        ]}
      >
        {selected && (
          <View style={styles.checkBadge}>
            <MaterialIcons name="check" size={16} color={colors.white} />
          </View>
        )}
        <View style={[styles.letterBadge, selected && styles.letterBadgeSelected]}>
          <Text style={[styles.letterText, selected && styles.letterTextSelected]}>{letter}</Text>
        </View>
        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{text}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function RecipeStepScreen({ content, onNext, onBack, onClose }: RecipeStepScreenProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<number | null>(null);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const skipAnim = useRef(new Animated.Value(0)).current;

  const toggleCheckpoint = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCheckpointOpen(prev => !prev);
  };

  const handleSkipPressIn = () => Animated.timing(skipAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  const handleSkipPressOut = () => Animated.timing(skipAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();

  const { checkpoint } = content;

  return (
    <View style={styles.root}>
      <GridBackground />

      <RecipeHeader
        title="RECIPE CHALLENGE"
        timeMinutes={content.timeMinutes}
        onLeft={onBack}
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
            <StepBadge label={`STEP ${content.stepNumber}`} />
            <Text style={styles.title}>{content.title}</Text>
          </View>

          {/* Instruction card */}
          <AccentCard>
            <Text style={styles.instruction}>{content.instruction}</Text>

            {content.whatToLookFor && (
              <>
                <View style={styles.divider} />
                <Text style={styles.lookForLabel}>WHAT TO LOOK FOR</Text>
                <Text style={styles.lookForText}>{content.whatToLookFor}</Text>
              </>
            )}
          </AccentCard>

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
          {checkpoint && (
            <View style={styles.checkpointShadowWrap}>
              <View style={styles.checkpointShadow} />
              <View style={styles.checkpointCard}>
                <Pressable style={styles.checkpointHeader} onPress={toggleCheckpoint}>
                  <View style={styles.checkpointBadge}>
                    <Text style={styles.checkpointBadgeText}>CHECKPOINT QUESTION</Text>
                  </View>
                  <MaterialIcons
                    name={checkpointOpen ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={colors.ink}
                  />
                </Pressable>

                {checkpointOpen && (
                  <>
                    <Text style={styles.checkpointQuestion}>{checkpoint.question}</Text>

                    <View style={styles.options}>
                      {checkpoint.options.map((option, i) => (
                        <CheckpointOption
                          key={i}
                          letter={OPTION_LETTERS[i]}
                          text={option}
                          selected={selected === i}
                          onSelect={() => setSelected(i)}
                        />
                      ))}
                    </View>

                    {/* Inline action row */}
                    <View style={styles.actionRow}>
                      <Pressable
                        onPressIn={handleSkipPressIn}
                        onPressOut={handleSkipPressOut}
                        onPress={() => {}}
                        style={styles.skipWrapper}
                      >
                        <Animated.View
                          style={[styles.skipShadow, {
                            opacity: skipAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                          }]}
                        />
                        <Animated.View
                          style={[styles.skipButton, {
                            transform: [
                              { translateX: skipAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
                              { translateY: skipAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
                            ],
                          }]}
                        >
                          <MaterialIcons name="skip-next" size={18} color={colors.ink} />
                          <Text style={styles.skipLabel}>SKIP</Text>
                        </Animated.View>
                      </Pressable>
                      <View style={styles.checkWrapper}>
                        <InkButton label="CHECK" onPress={() => {}} />
                      </View>
                    </View>
                  </>
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
  title: {
    fontFamily: fonts.headline,
    fontSize: 36,
    lineHeight: 40,
    color: colors.ink,
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
  checkpointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: 14,
  },
  optionWrapper: {
    position: 'relative',
    paddingBottom: 6,
    paddingRight: 6,
  },
  optionShadow: {
    position: 'absolute',
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
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: colors.amberDark,
    borderStyle: 'dashed',
  },
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
  optionText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  optionTextSelected: {
    color: colors.amberDark,
  },

  // Inline action row
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: spacing.md,
    alignItems: 'stretch',
  },
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
  checkWrapper: {
    flex: 1,
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
