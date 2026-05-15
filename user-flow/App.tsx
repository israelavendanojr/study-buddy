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
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import OnboardingFlow from './src/screens/onboarding/OnboardingFlow';
import TrailScreen from './src/screens/trail/TrailScreen';
import LessonFlowScreen from './src/screens/lesson/LessonFlowScreen';
import RecipeFlowScreen from './src/screens/recipe/RecipeFlowScreen';
import MissionFlowScreen from './src/screens/kitchen/MissionFlowScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import GridBackground from './src/components/GridBackground';

const screenHeight = Dimensions.get('window').height;

function AppContent() {
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isInLesson, setIsInLesson] = useState(false);
  const [isInRecipe, setIsInRecipe] = useState(false);
  const [isInMission, setIsInMission] = useState(false);
  const curtainY = useRef(new Animated.Value(screenHeight)).current;
  const curtainOpacity = useRef(new Animated.Value(1)).current;

  const handleStartLesson = () => {
    curtainY.setValue(screenHeight);
    curtainOpacity.setValue(1);
    Animated.timing(curtainY, {
      toValue: 0,
      duration: 320,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsInLesson(true);
      setTimeout(() => {
        Animated.timing(curtainOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 180);
    });
  };

  const handleStartRecipe = () => {
    curtainY.setValue(screenHeight);
    curtainOpacity.setValue(1);
    Animated.timing(curtainY, {
      toValue: 0,
      duration: 320,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsInRecipe(true);
      setTimeout(() => {
        Animated.timing(curtainOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 180);
    });
  };

  const handleCloseRecipe = () => {
    curtainY.setValue(0);
    Animated.timing(curtainOpacity, {
      toValue: 1,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsInRecipe(false);
      Animated.timing(curtainY, {
        toValue: screenHeight,
        duration: 320,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleStartMission = () => {
    curtainY.setValue(screenHeight);
    curtainOpacity.setValue(1);
    Animated.timing(curtainY, {
      toValue: 0,
      duration: 320,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsInMission(true);
      setTimeout(() => {
        Animated.timing(curtainOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 180);
    });
  };

  const handleCloseMission = () => {
    curtainY.setValue(0);
    Animated.timing(curtainOpacity, {
      toValue: 1,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsInMission(false);
      Animated.timing(curtainY, {
        toValue: screenHeight,
        duration: 320,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleCloseLesson = () => {
    curtainY.setValue(0);
    Animated.timing(curtainOpacity, {
      toValue: 1,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsInLesson(false);
      Animated.timing(curtainY, {
        toValue: screenHeight,
        duration: 320,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {isOnboarding ? (
        isSigningIn ? (
          <SignInScreen onBack={() => setIsSigningIn(false)} />
        ) : (
          <OnboardingFlow onComplete={() => setIsOnboarding(false)} onSignIn={() => setIsSigningIn(true)} />
        )
      ) : (
        <>
          {isInLesson ? (
            <LessonFlowScreen onClose={handleCloseLesson} />
          ) : isInRecipe ? (
            <RecipeFlowScreen onClose={handleCloseRecipe} />
          ) : isInMission ? (
            <MissionFlowScreen onClose={handleCloseMission} />
          ) : (
            <TrailScreen onStartLesson={handleStartLesson} onStartRecipe={handleStartRecipe} onStartMission={handleStartMission} />
          )}
          {/* Grid curtain overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { transform: [{ translateY: curtainY }], opacity: curtainOpacity, zIndex: 100 },
            ]}
          >
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.canvas }]} />
            <GridBackground />
          </Animated.View>
        </>
      )}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_700Bold,
    Newsreader_700Bold_Italic,
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
});
