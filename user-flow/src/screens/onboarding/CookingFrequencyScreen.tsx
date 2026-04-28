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
    description: 'I meal prep or cook 3–5 nights a week. It’s a regular part of my routine.',
  },
  {
    id: 'daily',
    title: 'Daily',
    description: 'I’m at the stove every day. Cooking is my primary way of fueling myself and/or others.',
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
        {/* Header: mascot + question */}
        <View style={styles.header}>
          <MonkeyMascot size={90} />
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>How often do you cook currently?</Text>
          </View>
        </View>

        {/* Options list */}
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

      {/* Fixed footer */}
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
