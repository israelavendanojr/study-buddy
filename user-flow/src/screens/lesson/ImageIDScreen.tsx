import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
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
import { ImageIDData, ImageIDOption } from '../../types/lesson';

interface ImageIDScreenProps {
  onNext: () => void;
  onSkip: () => void;
  question: ImageIDData;
}

function ImageCard({
  option,
  selected,
  onSelect,
}: {
  option: ImageIDOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <PressableCard
      onPress={onSelect}
      selected={selected}
      cardStyle={[
        styles.cardFace,
        selected ? styles.cardFaceSelected : styles.cardFaceActive,
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
    </PressableCard>
  );
}

export default function ImageIDScreen({
  onNext,
  onSkip,
  question,
}: ImageIDScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const topOptions = question.options.slice(0, 2);
  const bottomOption = question.options[2];

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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
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

  // Image card face
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
  checkButtonWrapper: {
    flex: 1,
  },
  checkButtonDisabled: {
    opacity: 0.4,
  },
});
