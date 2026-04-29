import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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
import { colors, fonts, spacing } from '../../theme';
import { FillBlankData } from '../../types/lesson';

interface FillBlankScreenProps {
  onNext: () => void;
  onSkip: () => void;
  activity: FillBlankData;
}

function TokenChip({
  token,
  isUsed,
  onSelect,
}: {
  token: string;
  isUsed: boolean;
  onSelect: () => void;
}) {
  const translateAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!isUsed) {
      translateAnim.setValue(1);
      Animated.timing(translateAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [isUsed]);

  const handlePressIn = () => {
    if (isUsed) return;
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    if (isUsed) return;
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={isUsed ? undefined : onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.chipWrapper}
    >
      <Animated.View
        style={[
          styles.chipShadow,
          {
            opacity: isUsed
              ? 0
              : translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.chip,
          isUsed && styles.chipUsed,
          !isUsed && {
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
        <Text style={[styles.chipText, isUsed && styles.chipTextGhost]}>{token}</Text>
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

export default function FillBlankScreen({
  onNext,
  onSkip,
  activity,
}: FillBlankScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  const handleChipSelect = (token: string) => {
    setSelectedToken(token);
  };

  const handleBlankPress = () => {
    setSelectedToken(null);
  };

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
        {/* Question row: mascot + prompt card */}
        <View style={styles.questionRow}>
          <MonkeyMascot size={90} />
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{activity.prompt}</Text>
          </View>
        </View>

        {/* Sentence card with inline blank */}
        <View style={styles.sentenceShadow}>
          <Pressable
            style={styles.sentenceCard}
            onPress={selectedToken ? handleBlankPress : undefined}
          >
            <Text style={styles.sentenceText}>
              {activity.sentenceBefore + ' '}
              <Text
                style={selectedToken ? styles.blankFilled : styles.blankEmpty}
                suppressHighlighting
              >
                {selectedToken ?? '________'}
              </Text>
              {activity.sentenceAfter}
            </Text>
          </Pressable>
        </View>

        {/* Word bank */}
        <Text style={styles.wordBankLabel}>WORD BANK</Text>
        <View style={styles.wordBankBox}>
          {activity.tokens.map((token) => (
            <View
              key={token}
              style={styles.chipCell}
            >
              <TokenChip
                token={token}
                isUsed={selectedToken === token}
                onSelect={() => handleChipSelect(token)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <SkipButton onPress={onSkip} />
        <View style={[styles.checkButtonWrapper, !selectedToken && styles.checkButtonDisabled]}>
          <InkButton
            label="CHECK"
            onPress={selectedToken ? onNext : undefined}
            disabled={!selectedToken}
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

  // Sentence card
  sentenceShadow: {
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  sentenceCard: {
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: spacing.lg,
  },
  sentenceText: {
    fontFamily: fonts.headline,
    fontSize: 26,
    lineHeight: 42,
    color: colors.ink,
  },

  // Inline blank — empty
  blankEmpty: {
    fontFamily: fonts.headline,
    fontSize: 26,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
    textDecorationColor: colors.onSurfaceVariant,
  },

  // Inline blank — filled
  blankFilled: {
    fontFamily: fonts.headline,
    fontSize: 26,
    color: colors.amber,
  },

  // Word bank
  wordBankLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
    marginBottom: -spacing.sm,
  },
  wordBankBox: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipCell: {
    width: '47%',
  },

  // Token chip — active
  chipWrapper: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
    height: 52,
  },
  chipShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  chip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    bottom: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.ink,
  },

  // Token chip — used/ghost state
  chipUsed: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  chipTextGhost: {
    opacity: 0.25,
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
  checkButtonWrapper: {
    flex: 1,
  },
  checkButtonDisabled: {
    opacity: 0.4,
  },

});
