import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface RecipeStepIndicatorProps {
  stepCount: number;   // number of cooking steps (not counting prep)
  currentStep: number; // 0 = prep/ingredients, 1..stepCount = cooking steps
}

export default function RecipeStepIndicator({ stepCount, currentStep }: RecipeStepIndicatorProps) {
  // Total dots = stepCount + 1 (index 0 = prep)
  const totalDots = stepCount + 1;

  const label = currentStep === 0
    ? `STEP 0 OF ${stepCount} — PREP`
    : `STEP ${currentStep} OF ${stepCount}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length: totalDots }).map((_, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.line} />}
              {isDone ? (
                <View style={styles.dotDone}>
                  <MaterialIcons name="check" size={7} color={colors.white} />
                </View>
              ) : isActive ? (
                <View style={styles.dotActiveOuter}>
                  <View style={styles.dotActiveInner} />
                </View>
              ) : (
                <View style={styles.dotPending} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    width: 32,
    height: 1.5,
    backgroundColor: colors.ink,
    opacity: 0.25,
  },
  // Done: amber fill + checkmark, 10×10
  dotDone: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.amber,
    borderWidth: 1.5,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Active: amber fill, 18×18, dashed amber border with white gap ring
  dotActiveOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.amber,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  dotActiveInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.amber,
  },
  // Pending: canvas fill, ink border, 10×10
  dotPending: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.canvas,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },
});
