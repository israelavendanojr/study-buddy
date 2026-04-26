import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import MonkeyMascot from '../../components/MonkeyMascot';
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
import ProgressBar from '../../components/ProgressBar';
import { borderRadius, colors, fonts, spacing } from '../../theme';
import { OnboardingScreenProps } from './types';

type GoalId = 'scratch' | 'home' | 'skill' | 'cuisine' | 'healthy' | 'allergy';

interface Goal {
  id: GoalId;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  disabled?: boolean;
}

const GOALS: Goal[] = [
  {
    id: 'scratch',
    title: 'Learn to cook from scratch',
    subtitle: 'Build real skills from the ground up',
    icon: 'restaurant',
  },
  {
    id: 'home',
    title: 'Cook better at home',
    subtitle: 'Understand why your food tastes the way it does',
    icon: 'home',
  },
  {
    id: 'skill',
    title: 'Master a specific skill',
    subtitle: 'Knife work, sauces, heat control, flavor',
    icon: 'outdoor-grill',
  },
  {
    id: 'cuisine',
    title: 'Learn a cuisine',
    subtitle: 'Italian, Asian, French \u2014 more coming soon',
    icon: 'public',
    disabled: true,
  },
  {
    id: 'healthy',
    title: 'Cook healthier',
    subtitle: 'Balanced meals, nutrition-forward cooking',
    icon: 'eco',
    disabled: true,
  },
  {
    id: 'allergy',
    title: 'Allergy-aware cooking',
    subtitle: 'Gluten-free, dairy-free, nut-safe kitchen',
    icon: 'warning-amber',
    disabled: true,
  },
];

function GoalCard({
  goal,
  selected,
  onSelect,
}: {
  goal: Goal;
  selected: boolean;
  onSelect: () => void;
}) {
  const translateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (goal.disabled) return;
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    if (goal.disabled) return;
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  const isSelected = selected && !goal.disabled;
  const shadowColor = isSelected ? colors.amberDark : colors.ink;
  const shadowOffset = isSelected ? 6 : 4;

  return (
    <Pressable
      onPress={goal.disabled ? undefined : onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.cardWrapper, goal.disabled && styles.cardDisabled]}
    >
      {/* Block shadow */}
      {!goal.disabled && (
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
      )}

      {/* Card face */}
      <Animated.View
        style={[
          styles.card,
          isSelected ? styles.cardSelected : goal.disabled ? styles.cardDisabledFace : styles.cardActive,
          {
            transform: [
              {
                translateX: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, goal.disabled ? 0 : shadowOffset],
                }),
              },
              {
                translateY: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, goal.disabled ? 0 : shadowOffset],
                }),
              },
            ],
          },
        ]}
      >
        {/* Checkmark badge */}
        {isSelected && (
          <View style={styles.checkBadge}>
            <MaterialIcons name="check" size={16} color={colors.white} />
          </View>
        )}

        {/* Icon box */}
        <View
          style={[
            styles.iconBox,
            isSelected ? styles.iconBoxSelected : goal.disabled ? styles.iconBoxDisabled : styles.iconBoxActive,
          ]}
        >
          <MaterialIcons
            name={goal.icon}
            size={26}
            color={isSelected ? colors.white : goal.disabled ? colors.onSurfaceVariant : colors.ink}
          />
        </View>

        {/* Text */}
        <Text
          style={[
            styles.cardTitle,
            isSelected && styles.cardTitleSelected,
            goal.disabled && styles.cardTitleDisabled,
          ]}
          numberOfLines={2}
        >
          {goal.title}
        </Text>
        <Text style={[styles.cardSubtitle, goal.disabled && styles.cardSubtitleDisabled]} numberOfLines={3}>
          {goal.subtitle}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function GoalSelectionScreen({ onContinue, onBack, progress }: OnboardingScreenProps) {
  const [selectedGoal, setSelectedGoal] = useState<GoalId>('home');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <GridBackground />

      {/* Progress bar pinned below status bar */}
      <View style={[styles.progressBarContainer, { top: insets.top }]}>
        <ProgressBar progress={progress} onBack={onBack ?? (() => {})} />
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
          {/* Monkey mascot */}
          <MonkeyMascot size={90} />
          {/* Question card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>Why are you wanting to improve your cooking?</Text>
          </View>
        </View>

        {/* 2-column goals grid */}
        <View style={styles.grid}>
          {GOALS.map((goal) => (
            <View key={goal.id} style={styles.gridItem}>
              <GoalCard
                goal={goal}
                selected={selectedGoal === goal.id}
                onSelect={() => setSelectedGoal(goal.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <InkButton label="CONTINUE" textColor="#FBF6E6" onPress={() => onContinue?.()} />
        <Text style={styles.footerCaption}>You can change your goal anytime in your profile.</Text>
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
  mascot: {
    width: 84,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
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

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md + 4, // extra room for block shadow
  },

  // Card
  cardWrapper: {
    flex: 1,
    position: 'relative',
    paddingBottom: 6,
    paddingRight: 6,
  },
  cardDisabled: {
    opacity: 0.5,
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
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
    flex: 1,
    minHeight: 150,
    justifyContent: 'center',
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
  cardDisabledFace: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
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

  // Icon box
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: colors.canvasAlt,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  iconBoxSelected: {
    backgroundColor: colors.amber,
    borderWidth: 0,
  },
  iconBoxDisabled: {
    backgroundColor: 'rgba(249,247,242,0.3)',
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
  },

  // Card text
  cardTitle: {
    fontFamily: fonts.headline,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  cardTitleSelected: {
    color: colors.amberDark,
  },
  cardTitleDisabled: {
    color: colors.ink,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cardSubtitleDisabled: {
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
