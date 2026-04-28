import React, { useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProgressBar from '../../components/ProgressBar';
import CommitmentScreen from './CommitmentScreen';
import CookingFrequencyScreen from './CookingFrequencyScreen';
import ExperienceLevelScreen from './ExperienceLevelScreen';
import GoalSelectionScreen from './GoalSelectionScreen';
import GradingModeScreen from './GradingModeScreen';
import RoadmapLoadingScreen from './RoadmapLoadingScreen';
import { OnboardingScreenProps } from './types';
import WelcomeScreen from './WelcomeScreen';

type ScreenEntry = {
  key: string;
  component: React.ComponentType<OnboardingScreenProps>;
  showProgress?: boolean;
};

// Reorder, add, or remove entries here to change the onboarding flow.
// Progress bar value and back/forward wiring are derived automatically.
const ONBOARDING_FLOW: ScreenEntry[] = [
  { key: 'welcome',    component: WelcomeScreen, showProgress: false },
  { key: 'goal',       component: GoalSelectionScreen },
  { key: 'cooking',    component: CookingFrequencyScreen },
  { key: 'experience', component: ExperienceLevelScreen },
  { key: 'grading',    component: GradingModeScreen },
  { key: 'commitment', component: CommitmentScreen },
  { key: 'loading',    component: RoadmapLoadingScreen, showProgress: false },
];

const PROGRESS_SCREENS = ONBOARDING_FLOW.filter(s => s.showProgress !== false);

const screenWidth = Dimensions.get('window').width;

function progressOf(index: number) {
  const entry = ONBOARDING_FLOW[index];
  const pi = PROGRESS_SCREENS.findIndex(s => s.key === entry.key);
  return pi >= 0 ? (pi + 1) / PROGRESS_SCREENS.length : 1;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  const handleComplete = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => onComplete());
  };

  const navigate = (nextIndex: number, dir: 'forward' | 'back') => {
    if (isTransitioning) return;
    setPrevIndex(screenIndex);
    setScreenIndex(nextIndex);
    setDirection(dir);
    setIsTransitioning(true);
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    });
  };

  const current = ONBOARDING_FLOW[screenIndex];
  const CurrentScreen = current.component;
  const prev = prevIndex !== null ? ONBOARDING_FLOW[prevIndex] : null;
  const PrevScreen = prev?.component ?? null;

  const progress = progressOf(screenIndex);
  const showProgress = current.showProgress !== false;

  const sign = direction === 'forward' ? 1 : -1;
  const slideDistance = screenWidth * 0.15;
  const incomingTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [sign * slideDistance, 0],
  });
  const outgoingTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -sign * slideDistance],
  });
  const incomingOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const outgoingOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
      {/* Outgoing screen — only visible during transition */}
      {isTransitioning && PrevScreen && prevIndex !== null && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: outgoingOpacity, transform: [{ translateX: outgoingTranslate }] }]}>
          <PrevScreen
            key={prev!.key}
            progress={progressOf(prevIndex)}
            onContinue={undefined}
            onBack={undefined}
          />
        </Animated.View>
      )}

      {/* Incoming / current screen */}
      <Animated.View style={[
        StyleSheet.absoluteFillObject,
        isTransitioning && { opacity: incomingOpacity, transform: [{ translateX: incomingTranslate }] },
      ]}>
        <CurrentScreen
          key={current.key}
          progress={progress}
          onContinue={screenIndex < ONBOARDING_FLOW.length - 1 ? () => navigate(screenIndex + 1, 'forward') : handleComplete}
          onBack={screenIndex > 0 ? () => navigate(screenIndex - 1, 'back') : undefined}
        />
      </Animated.View>

      {/* Progress bar overlay — persists across transitions */}
      {showProgress && (
        <View style={[styles.progressOverlay, { top: insets.top }]}>
          <ProgressBar
            progress={progress}
            onBack={screenIndex > 0 ? () => navigate(screenIndex - 1, 'back') : undefined}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
