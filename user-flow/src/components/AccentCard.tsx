import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface AccentCardProps {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
}

export default function AccentCard({ children, contentStyle, style }: AccentCardProps) {
  return (
    <View style={[styles.shadow, style]}>
      <View style={styles.card}>
        <View style={[styles.content, contentStyle]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  card: {
    backgroundColor: colors.canvas,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    borderRightWidth: 2,
    borderRightColor: colors.ink,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    borderLeftWidth: 10,
    borderLeftColor: colors.amber,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
});
