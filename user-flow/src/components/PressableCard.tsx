import React, { ReactNode } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useButtonPress } from '../hooks/useButtonPress';
import { colors } from '../theme';

interface PressableCardProps {
  onPress: () => void;
  selected?: boolean;
  /** Shadow layer offset in px. Defaults to 6 when selected, 4 otherwise. */
  shadowOffset?: number;
  /** Shadow layer color. Defaults to amberDark when selected, ink otherwise. */
  shadowColor?: string;
  /** Extra style on the outer Pressable wrapper (e.g. flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Style applied to the animated card face (borders, background, padding, etc.). */
  cardStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * The block-shadow animated card primitive used throughout the app.
 *
 * Renders a shadow layer + an animated face that slides into the shadow on press.
 * Pass `cardStyle` to set borders, background, padding, and layout on the card face.
 * Pass `style` to control the outer wrapper (width, flex, etc.).
 */
export default function PressableCard({
  onPress,
  selected = false,
  shadowOffset,
  shadowColor,
  style,
  cardStyle,
  children,
}: PressableCardProps) {
  const { translateAnim, handlePressIn, handlePressOut } = useButtonPress();

  const offset = shadowOffset ?? (selected ? 6 : 4);
  const sColor = shadowColor ?? (selected ? colors.amberDark : colors.ink);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.wrapper, { paddingBottom: offset, paddingRight: offset }, style]}
    >
      {/* Block shadow — absolute, sits behind the face */}
      <Animated.View
        style={[
          styles.shadow,
          {
            backgroundColor: sColor,
            top: offset,
            left: offset,
            opacity: translateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      />

      {/* Card face — normal flow, translates on press */}
      <Animated.View
        style={[
          styles.face,
          {
            transform: [
              {
                translateX: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, offset],
                }),
              },
              {
                translateY: translateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, offset],
                }),
              },
            ],
          },
          cardStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  face: {
    position: 'relative',
  },
});
