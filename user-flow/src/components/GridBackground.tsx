import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Renders a subtle 20x20 grid using SVG-like approach with Views.
// We use a pattern via a fixed-size repeating approach.
export default function GridBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Vertical lines */}
      {Array.from({ length: 40 }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={[styles.verticalLine, { left: i * 20 }]}
        />
      ))}
      {/* Horizontal lines */}
      {Array.from({ length: 100 }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={[styles.horizontalLine, { top: i * 20 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.grid,
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.grid,
  },
});
