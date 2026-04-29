import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
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

interface ImageIDScreenProps {
  onNext: () => void;
  onSkip: () => void;
}

interface ImageOption {
  id: string;
  label: string;
  image: ImageSourcePropType;
}

const QUESTION = {
  text: 'Which image shows a proper sear in progress?',
  options: [
    {
      id: 'A',
      label: 'PALE, STEAMING SURFACE',
      image: require('../../../assets/sear_images/steam.jpeg') as ImageSourcePropType,
    },
    {
      id: 'B',
      label: 'GOLDEN BROWN CRUST',
      image: require('../../../assets/sear_images/Sear.jpg') as ImageSourcePropType,
    },
    {
      id: 'C',
      label: 'BURNT DARK EDGES',
      image: require('../../../assets/sear_images/burnt.jpg') as ImageSourcePropType,
    },
  ] as ImageOption[],
  correctId: 'B',
};

function ImageCard({
  option,
  selected,
  onSelect,
}: {
  option: ImageOption;
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
      style={styles.cardWrapper}
    >
      {/* Block shadow */}
      <Animated.View
        style={[
          styles.cardShadow,
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
          styles.cardFace,
          selected ? styles.cardFaceSelected : styles.cardFaceActive,
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
            <MaterialIcons name="check" size={14} color={colors.white} />
          </View>
        )}

        {/* Image */}
        <Image source={option.image} style={styles.cardImage} resizeMode="cover" />

        {/* Label */}
        <View style={[styles.labelContainer, selected && styles.labelContainerSelected]}>
          <Text style={[styles.labelText, selected && styles.labelTextSelected]}>
            {option.label}
          </Text>
        </View>
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

export default function ImageIDScreen({
  onNext,
  onSkip,
}: ImageIDScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const topOptions = QUESTION.options.slice(0, 2);
  const bottomOption = QUESTION.options[2];

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
            <Text style={styles.questionText}>{QUESTION.text}</Text>
          </View>
        </View>

        {/* Image grid: 2 top + 1 centered bottom */}
        <View style={styles.imageGrid}>
          <View style={styles.topRow}>
            {topOptions.map((option) => (
              <View key={option.id} style={styles.topCardSlot}>
                <ImageCard
                  option={option}
                  selected={selectedId === option.id}
                  onSelect={() => setSelectedId(option.id)}
                />
              </View>
            ))}
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.bottomCardSlot}>
              <ImageCard
                option={bottomOption}
                selected={selectedId === bottomOption.id}
                onSelect={() => setSelectedId(bottomOption.id)}
              />
            </View>
          </View>
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

  // Image grid
  imageGrid: {
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  topCardSlot: {
    flex: 1,
  },
  bottomRow: {
    alignItems: 'center',
  },
  bottomCardSlot: {
    width: '52%',
  },

  // Image card
  cardWrapper: {
    position: 'relative',
    paddingBottom: 6,
    paddingRight: 6,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
  },
  cardFace: {
    overflow: 'hidden',
    position: 'relative',
  },
  cardFaceActive: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'solid',
    backgroundColor: colors.surfaceContainer,
  },
  cardFaceSelected: {
    borderWidth: 2,
    borderColor: colors.amberDark,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceContainer,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  labelContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    alignItems: 'center',
  },
  labelContainerSelected: {
    borderTopColor: colors.amberDark,
  },
  labelText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.ink,
    textAlign: 'center',
  },
  labelTextSelected: {
    color: colors.amberDark,
  },

  // Checkmark badge
  checkBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: colors.amberDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.canvas,
    zIndex: 5,
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
