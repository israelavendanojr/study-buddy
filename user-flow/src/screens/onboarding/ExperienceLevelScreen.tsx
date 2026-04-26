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

import MonkeyMascot from '../../components/MonkeyMascot';
import GridBackground from '../../components/GridBackground';
import InkButton from '../../components/InkButton';
import ProgressBar from '../../components/ProgressBar';
import { borderRadius, colors, fonts, spacing } from '../../theme';

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
  const translateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  const shadowColor = selected ? colors.amberDark : colors.ink;
  const shadowOffset = selected ? 6 : 4;

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
          styles.card,
          selected ? styles.cardSelected : styles.cardActive,
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

        <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
          {option.title}
        </Text>
        <Text style={styles.cardDescription}>{option.description}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ExperienceLevelScreen({ onContinue, onBack }: { onContinue?: () => void; onBack?: () => void }) {
  const [selected, setSelected] = useState<ExperienceId>('occasional');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Progress bar pinned below status bar */}
      <View style={[styles.progressBarContainer, { top: insets.top }]}>
        <ProgressBar progress={0.3} onBack={onBack ?? (() => {})} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 52 + spacing.md, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: mascot + question */}
        <View style={styles.header}>
          <MonkeyMascot size={90} />
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>What's your experience level?</Text>
          </View>
        </View>

        {/* Options list */}
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

      {/* Fixed footer */}
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
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    textAlign: 'center',
  },

  // List
  list: {
    gap: spacing.md,
  },

  // Card
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
