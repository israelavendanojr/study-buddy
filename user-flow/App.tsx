import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_700Bold,
} from '@expo-google-fonts/newsreader';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import ProgressBar from './src/components/ProgressBar';
import GoalSelectionScreen from './src/screens/onboarding/GoalSelectionScreen';
import CookingFrequencyScreen from './src/screens/onboarding/CookingFrequencyScreen';
import ExperienceLevelScreen from './src/screens/onboarding/ExperienceLevelScreen';
import GradingModeScreen from './src/screens/onboarding/GradingModeScreen';
import CommitmentScreen from './src/screens/onboarding/CommitmentScreen';
import RoadmapLoadingScreen from './src/screens/onboarding/RoadmapLoadingScreen';
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import { OnboardingScreenProps } from './src/screens/onboarding/types';
import { colors } from './src/theme';
import TrailScreen from './src/screens/trail/TrailScreen';
import LessonFlowScreen from './src/screens/lesson/LessonFlowScreen';

type ScreenEntry = {
  key: string;
  component: React.ComponentType<OnboardingScreenProps>;
  showProgress?: boolean; // false for terminal/loading screens
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

function AppContent() {
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isInLesson, setIsInLesson] = useState(false);
  const fadeToTrail = useRef(new Animated.Value(1)).current;
  const [screenIndex, setScreenIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const handleOnboardingComplete = () => {
    Animated.timing(fadeToTrail, {
      toValue: 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => setIsOnboarding(false));
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
  const slideDistance = screenWidth * 0.15
  ;
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
    <View style={styles.container}>
      <StatusBar style="dark" />

      {!isOnboarding ? (
        isInLesson ? (
          <LessonFlowScreen onClose={() => setIsInLesson(false)} />
        ) : (
          <TrailScreen onStartLesson={() => setIsInLesson(true)} />
        )
      ) : (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeToTrail }]}>
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
              onContinue={screenIndex < ONBOARDING_FLOW.length - 1 ? () => navigate(screenIndex + 1, 'forward') : handleOnboardingComplete}
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
      )}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_700Bold,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
