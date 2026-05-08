import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface XPBannerProps {
  xpEarned: number;
  label: string;
}

export default function XPBanner({ xpEarned, label }: XPBannerProps) {
  return (
    <View style={styles.xpWrap}>
      <View style={styles.xpShadow} />
      <View style={styles.xpBanner}>
        <View style={styles.xpTextBlock}>
          <Text style={styles.xpAmount}>+{xpEarned} XP EARNED</Text>
          <Text style={styles.xpSub}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  xpWrap: {
    position: 'relative',
    paddingBottom: 4,
    paddingRight: 4,
  },
  xpShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  xpBanner: {
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  xpTextBlock: {
    alignItems: 'center',
    gap: 2,
  },
  xpAmount: {
    fontFamily: fonts.label,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.canvas,
  },
  xpSub: {
    fontFamily: fonts.label,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.canvas,
    opacity: 0.75,
  },
});
