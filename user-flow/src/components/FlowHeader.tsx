import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';

export const FLOW_HEADER_HEIGHT = 56;

interface FlowHeaderProps {
  title: string;
  onLeft: () => void;
  leftIcon?: React.ReactNode;
  timeMinutes?: number;
}

export default function FlowHeader({ title, onLeft, leftIcon, timeMinutes }: FlowHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.topBar, { paddingTop: insets.top, height: FLOW_HEADER_HEIGHT + insets.top }]}>
      <Pressable onPress={onLeft} style={styles.leftBtn} hitSlop={12}>
        {leftIcon ?? <Text style={styles.backArrow}>‹</Text>}
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightSlot}>
        {timeMinutes != null && (
          <Text style={styles.timeText}>{timeMinutes} MIN</Text>
        )}
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
    paddingHorizontal: spacing.md,
    backgroundColor: colors.canvas,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  leftBtn: {
    width: 40,
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
    fontSize: 13,
    letterSpacing: 3,
    color: colors.ink,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
  timeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.amber,
  },
});
