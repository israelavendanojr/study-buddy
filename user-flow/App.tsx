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
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GoalSelectionScreen from './src/screens/onboarding/GoalSelectionScreen';
import CookingFrequencyScreen from './src/screens/onboarding/CookingFrequencyScreen';
import ExperienceLevelScreen from './src/screens/onboarding/ExperienceLevelScreen';
import GradingModeScreen from './src/screens/onboarding/GradingModeScreen';
import CommitmentScreen from './src/screens/onboarding/CommitmentScreen';
import RoadmapLoadingScreen from './src/screens/onboarding/RoadmapLoadingScreen';
import { OnboardingScreenProps } from './src/screens/onboarding/types';
import { colors } from './src/theme';

type ScreenEntry = {
  key: string;
  component: React.ComponentType<OnboardingScreenProps>;
  showProgress?: boolean; // false for terminal/loading screens
};

// Reorder, add, or remove entries here to change the onboarding flow.
// Progress bar value and back/forward wiring are derived automatically.
const ONBOARDING_FLOW: ScreenEntry[] = [
  { key: 'goal',       component: GoalSelectionScreen },
  { key: 'cooking',    component: CookingFrequencyScreen },
  { key: 'experience', component: ExperienceLevelScreen },
  { key: 'grading',    component: GradingModeScreen },
  { key: 'commitment', component: CommitmentScreen },
  { key: 'loading',    component: RoadmapLoadingScreen, showProgress: false },
];

const PROGRESS_SCREENS = ONBOARDING_FLOW.filter(s => s.showProgress !== false);

export default function App() {
  const [screenIndex, setScreenIndex] = useState(0);
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

  const current = ONBOARDING_FLOW[screenIndex];
  const CurrentScreen = current.component;

  const progressScreenIndex = PROGRESS_SCREENS.findIndex(s => s.key === current.key);
  const progress = progressScreenIndex >= 0
    ? (progressScreenIndex + 1) / PROGRESS_SCREENS.length
    : 1;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <CurrentScreen
        key={current.key}
        progress={progress}
        onContinue={screenIndex < ONBOARDING_FLOW.length - 1 ? () => setScreenIndex(i => i + 1) : undefined}
        onBack={screenIndex > 0 ? () => setScreenIndex(i => i - 1) : undefined}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
