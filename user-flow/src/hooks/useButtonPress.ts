import { useRef } from 'react';
import { Animated } from 'react-native';

export function useButtonPress() {
  const translateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(translateAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.timing(translateAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  return { translateAnim, handlePressIn, handlePressOut };
}
