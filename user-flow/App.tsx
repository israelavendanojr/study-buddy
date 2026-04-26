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
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GoalSelectionScreen from './src/screens/onboarding/GoalSelectionScreen';
import CookingFrequencyScreen from './src/screens/onboarding/CookingFrequencyScreen';
import ExperienceLevelScreen from './src/screens/onboarding/ExperienceLevelScreen';
import GradingModeScreen from './src/screens/onboarding/GradingModeScreen';
import CommitmentScreen from './src/screens/onboarding/CommitmentScreen';
import RoadmapLoadingScreen from './src/screens/onboarding/RoadmapLoadingScreen';
import { colors, fonts } from './src/theme';

type Screen = 'goal' | 'cooking' | 'experience' | 'grading' | 'commitment' | 'loading';

export default function App() {
  const [screen, setScreen] = useState<Screen>('goal');
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
      <StatusBar style="dark" />
      {screen === 'goal' && <GoalSelectionScreen onContinue={() => setScreen('cooking')} />}
      {screen === 'cooking' && <CookingFrequencyScreen onContinue={() => setScreen('experience')} onBack={() => setScreen('goal')} />}
      {screen === 'experience' && <ExperienceLevelScreen onContinue={() => setScreen('grading')} onBack={() => setScreen('cooking')} />}
      {screen === 'grading' && <GradingModeScreen onContinue={() => setScreen('commitment')} onBack={() => setScreen('experience')} />}
      {screen === 'commitment' && <CommitmentScreen onContinue={() => setScreen('loading')} onBack={() => setScreen('grading')} />}
      {screen === 'loading' && <RoadmapLoadingScreen />}
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
