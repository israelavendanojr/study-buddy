import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useButtonPress } from '../hooks/useButtonPress';
import { colors, fonts } from '../theme';

interface SkipButtonProps {
  onPress: () => void;
}

export default function SkipButton({ onPress }: SkipButtonProps) {
  const { translateAnim, handlePressIn, handlePressOut } = useButtonPress();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.wrapper}
    >
      {/* Block shadow */}
      <Animated.View
        style={[
          styles.shadow,
          {
            opacity: translateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      />
      {/* Button face */}
      <Animated.View
        style={[
          styles.button,
          {
            transform: [
              {
                translateX: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 4],
                }),
              },
              {
                translateY: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 4],
                }),
              },
            ],
          },
        ]}
      >
        <MaterialIcons name="skip-next" size={18} color={colors.ink} />
        <Text style={styles.label}>SKIP</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '35%',
    height: 56,
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  button: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 4,
    bottom: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.ink,
  },
});
