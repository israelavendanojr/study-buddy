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
import ProTipCard from '../../components/ProTipCard';
import FlowHeader, { FLOW_HEADER_HEIGHT } from '../../components/FlowHeader';
import RecipeStepIndicator from '../../components/RecipeStepIndicator';
import StepBadge from '../../components/StepBadge';
import { colors, fonts, spacing } from '../../theme';
import { RecipeIngredientsContent } from '../../types/recipe';

interface RecipeIngredientsScreenProps {
  content: RecipeIngredientsContent;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

export default function RecipeIngredientsScreen({ content, onNext, onBack, onClose }: RecipeIngredientsScreenProps) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggleChecked = (index: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  return (
    <View style={styles.root}>
      <GridBackground />

      <FlowHeader
        title="YOU'LL NEED"
        timeMinutes={content.timeMinutes}
        onLeft={onBack}
      />

      <View style={{ flex: 1, paddingTop: FLOW_HEADER_HEIGHT + insets.top }}>
      <RecipeStepIndicator stepCount={content.stepCount} currentStep={0} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StepBadge label="STEP 0" />

        {/* Ingredients card */}
        <View style={styles.cardShadowWrap}>
          <View style={styles.cardShadow} />
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderLabel}>INGREDIENTS</Text>
              <Text style={styles.cardHeaderCount}>
                {content.ingredients.length} TOTAL
              </Text>
            </View>

            {content.ingredients.map((ingredient, i) => (
              <Pressable
                key={i}
                style={styles.ingredientRow}
                onPress={() => toggleChecked(i)}
              >
                <View style={[styles.checkbox, checked.has(i) && styles.checkboxChecked]}>
                  {checked.has(i) && (
                    <MaterialIcons name="check" size={14} color={colors.white} />
                  )}
                </View>
                <Text style={[
                  styles.ingredientText,
                  checked.has(i) && styles.ingredientTextChecked,
                ]}>
                  {ingredient.text}
                  {ingredient.optional && (
                    <Text style={styles.optionalLabel}> (optional)</Text>
                  )}
                </Text>
              </Pressable>
            ))}

            <View style={styles.cardFooterNote}>
              <Text style={styles.cardFooterNoteText}>
                Tap each ingredient as you gather it.
              </Text>
            </View>
          </View>
        </View>

        
        {/* Pro tip */}
        <ProTipCard text="Have everything prepped and measured before you turn on the heat." />
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <InkButton label="I'M READY · START COOKING →" onPress={onNext} />
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
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },

  // Ingredients card
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
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeaderLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.ink,
  },
  cardHeaderCount: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.amber,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  ingredientText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  ingredientTextChecked: {
    opacity: 0.4,
    textDecorationLine: 'line-through',
  },
  optionalLabel: {
    fontFamily: fonts.headlineItalic,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  cardFooterNote: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.grid,
  },
  cardFooterNoteText: {
    fontFamily: fonts.headlineItalic,
    fontSize: 13,
    color: colors.onSurfaceVariant,
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
