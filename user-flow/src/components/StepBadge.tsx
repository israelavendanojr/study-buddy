import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface StepBadgeProps {
  label: string;
}

export default function StepBadge({ label }: StepBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  text: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.white,
  },
});
