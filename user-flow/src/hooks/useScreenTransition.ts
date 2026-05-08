import { useRef, useState } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const SLIDE_DISTANCE = screenWidth * 0.15;
const DURATION = 350;

export function useScreenTransition() {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const slideAnim = useRef(new Animated.Value(0)).current;

  function navigate(nextIndex: number, dir: 'forward' | 'back') {
    if (isTransitioning) return;
    setPrevIndex(index);
    setIndex(nextIndex);
    setDirection(dir);
    setIsTransitioning(true);
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    });
  }

  const sign = direction === 'forward' ? 1 : -1;

  const incomingStyle = {
    opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{
      translateX: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [sign * SLIDE_DISTANCE, 0],
      }),
    }],
  };

  const outgoingStyle = {
    opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{
      translateX: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -sign * SLIDE_DISTANCE],
      }),
    }],
  };

  return { index, prevIndex, isTransitioning, navigate, incomingStyle, outgoingStyle };
}
