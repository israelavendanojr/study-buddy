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
import ExperienceLevelScreen from './src/screens/onboarding/ExperienceLevelScreen';
import GradingModeScreen from './src/screens/onboarding/GradingModeScreen';
import { colors, fonts } from './src/theme';

type Screen = 'goal' | 'experience' | 'grading';

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
      {screen === 'goal' && <GoalSelectionScreen onContinue={() => setScreen('experience')} />}
      {screen === 'experience' && <ExperienceLevelScreen onContinue={() => setScreen('grading')} onBack={() => setScreen('goal')} />}
      {screen === 'grading' && <GradingModeScreen onContinue={() => {}} onBack={() => setScreen('experience')} />}
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
