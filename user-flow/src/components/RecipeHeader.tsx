import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';

export const RECIPE_HEADER_HEIGHT = 56;

interface RecipeHeaderProps {
  title: string;
  timeMinutes: number;
  onLeft: () => void;
}

export default function RecipeHeader({ title, timeMinutes, onLeft }: RecipeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.topBar, { paddingTop: insets.top, height: RECIPE_HEADER_HEIGHT + insets.top }]}>
      <Pressable onPress={onLeft} style={styles.leftBtn} hitSlop={12}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.timeSlot}>
        <Text style={styles.timeText}>{timeMinutes} MIN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.canvas,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  leftBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: 32,
    lineHeight: 34,
    color: colors.ink,
    fontWeight: '600',
  },
  title: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.ink,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 36,
    justifyContent: 'flex-end',
  },
  timeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.amber,
  },
});
