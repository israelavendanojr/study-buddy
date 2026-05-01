import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface RecipeStepIndicatorProps {
  stepCount: number;        // number of cooking steps (not counting prep)
  currentStep: number;      // 0 = prep/ingredients, 1..stepCount = cooking steps
  showCameraFinal?: boolean; // adds an extra camera icon dot, all prior dots shown as done
}

export default function RecipeStepIndicator({ stepCount, currentStep, showCameraFinal }: RecipeStepIndicatorProps) {
  // When showCameraFinal: all stepCount+1 normal dots are done, plus 1 camera dot
  const normalDots = stepCount + 1;
  const totalDots = showCameraFinal ? normalDots + 1 : normalDots;

  const label = showCameraFinal
    ? 'FINAL SUBMISSION'
    : currentStep === 0
      ? `STEP 0 OF ${stepCount}`
      : `STEP ${currentStep} OF ${stepCount}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length: totalDots }).map((_, i) => {
          const isCameraFinalDot = showCameraFinal && i === totalDots - 1;
          const isDone = showCameraFinal ? !isCameraFinalDot : i < currentStep;
          const isActive = !showCameraFinal && i === currentStep;
          return (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.line} />}
              {isCameraFinalDot ? (
                <View style={styles.dotCameraOuter}>
                  <MaterialIcons name="photo-camera" size={11} color={colors.ink} />
                </View>
              ) : isDone ? (
                <View style={styles.dotDone} />
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
      <Text style={[styles.label, showCameraFinal && styles.labelFinal]}>{label}</Text>
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
  // Camera final dot: dashed amber border, 22×22
  dotCameraOuter: {
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
  label: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },
  labelFinal: {
    color: colors.amber,
  },
});
