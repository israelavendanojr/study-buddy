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

type CommitmentId = '5' | '10' | '20' | '30';

interface CommitmentOption {
  id: CommitmentId;
  label: string;
}

const OPTIONS: CommitmentOption[] = [
  { id: '5',  label: '5 MINS' },
  { id: '10', label: '10 MINS' },
  { id: '20', label: '20 MINS' },
  { id: '30', label: '30 MINS' },
];

function CommitmentCard({
  option,
  selected,
  onSelect,
}: {
  option: CommitmentOption;
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

        <MaterialIcons
          name="timer"
          size={28}
          color={selected ? colors.amber : colors.onSurfaceVariant}
        />
        <Text style={[styles.minsText, selected && styles.minsTextSelected]}>
          {option.label}
        </Text>
        <Text style={[styles.perDayText, selected && styles.perDayTextSelected]}>
          PER DAY
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function CommitmentScreen({ onContinue, onBack, progress }: OnboardingScreenProps) {
  const [selected, setSelected] = useState<CommitmentId>('10');
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
            <Text style={styles.questionText}>What's your daily learning goal?</Text>
          </View>
        </View>

        {/* 2×2 grid */}
        <View style={styles.grid}>
          {OPTIONS.map((option) => (
            <View key={option.id} style={styles.gridItem}>
              <CommitmentCard
                option={option}
                selected={selected === option.id}
                onSelect={() => setSelected(option.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <InkButton label="CONTINUE" textColor="#FBF6E6" onPress={() => onContinue?.()} />
        <Text style={styles.footerCaption}>I'll use this to keep your daily roadmap achievable.</Text>
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

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md + 4,
  },

  // Card
  cardWrapper: {
    position: 'relative',
    paddingBottom: 6,
    paddingRight: 6,
    aspectRatio: 1,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    position: 'relative',
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
  minsText: {
    fontFamily: fonts.headline,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
  },
  minsTextSelected: {
    color: colors.amberDark,
  },
  perDayText: {
    fontFamily: fonts.label,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },
  perDayTextSelected: {
    color: colors.amberDark,
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
