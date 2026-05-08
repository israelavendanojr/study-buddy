import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_700Bold,
  Newsreader_700Bold_Italic,
} from '@expo-google-fonts/newsreader';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme';

export const ONBOARDING_KEY = '@garlic_onboarding_done';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Newsreader_700Bold,
    Newsreader_700Bold_Italic,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
  });

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !onboardingChecked) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (onboardingDone && inOnboarding) {
      router.replace('/(tabs)');
    } else if (!onboardingDone && !inOnboarding) {
      // Re-read AsyncStorage in case onboarding just completed and updated it
      AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
        if (val !== 'true') {
          router.replace('/onboarding');
        } else {
          setOnboardingDone(true);
        }
      });
    }
  }, [fontsLoaded, onboardingChecked, onboardingDone, segments]);

  if (!fontsLoaded || !onboardingChecked) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="lesson"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="recipe"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="mission"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
