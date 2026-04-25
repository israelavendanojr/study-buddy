import 'react-native-gesture-handler'
import React from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { StackCardStyleInterpolator } from '@react-navigation/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import * as SecureStore from 'expo-secure-store'
import { useFonts } from 'expo-font'
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_700Bold,
} from '@expo-google-fonts/newsreader'
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro'
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'

import { colors } from './src/theme'

// Auth
import SignInScreen from './src/screens/auth/SignInScreen'
import SignUpScreen from './src/screens/auth/SignUpScreen'

// Onboarding
import GoalSelectionScreen from './src/screens/onboarding/GoalSelectionScreen'
import ExperienceScreen from './src/screens/onboarding/ExperienceScreen'
import FrequencyScreen from './src/screens/onboarding/FrequencyScreen'
import GradingModeScreen from './src/screens/onboarding/GradingModeScreen'
import SuccessDefinitionScreen from './src/screens/onboarding/SuccessDefinitionScreen'
import CommitmentScreen from './src/screens/onboarding/CommitmentScreen'
import RoadmapLoadingScreen from './src/screens/onboarding/RoadmapLoadingScreen'

// Main tabs
import TrailScreen from './src/screens/trail/TrailScreen'
import KitchenScreen from './src/screens/kitchen/KitchenScreen'
import ProfileScreen from './src/screens/profile/ProfileScreen'

// Lesson flow
import LessonFlowScreen from './src/screens/lesson/LessonFlowScreen'
import LessonCompleteScreen from './src/screens/lesson/LessonCompleteScreen'

// Recipe flow
import RecipeIntroScreen from './src/screens/recipe/RecipeIntroScreen'
import RecipeIngredientsScreen from './src/screens/recipe/RecipeIngredientsScreen'
import RecipeStepScreen from './src/screens/recipe/RecipeStepScreen'
import RecipePhotoScreen from './src/screens/recipe/RecipePhotoScreen'
import RecipeFeedbackLoadingScreen from './src/screens/recipe/RecipeFeedbackLoadingScreen'
import RecipeFeedbackScreen from './src/screens/recipe/RecipeFeedbackScreen'

// Mission flow
import MissionDetailScreen from './src/screens/mission/MissionDetailScreen'
import MissionFeedbackScreen from './src/screens/mission/MissionFeedbackScreen'

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key)
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value)
  },
}

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

const forFade: StackCardStyleInterpolator = ({ current }) => ({
  cardStyle: { opacity: current.progress },
})

function MainTabs() {
  // Tab navigator with hidden tab bar — navigation handled by BottomNav inside each screen
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
    >
      <Tab.Screen name="Trail" component={TrailScreen} />
      <Tab.Screen name="Kitchen" component={KitchenScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

function AppNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isSignedIn, isLoaded } = useAuth()

  if (!fontsLoaded || !isLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {isSignedIn ? (
        <>
          {/* Onboarding — shown until roadmap exists */}
          <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
          <Stack.Screen name="Experience" component={ExperienceScreen} />
          <Stack.Screen name="Frequency" component={FrequencyScreen} />
          <Stack.Screen name="GradingMode" component={GradingModeScreen} />
          <Stack.Screen name="SuccessDefinition" component={SuccessDefinitionScreen} />
          <Stack.Screen name="Commitment" component={CommitmentScreen} />
          <Stack.Screen name="RoadmapLoading" component={RoadmapLoadingScreen} />

          {/* Main tabs */}
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ cardStyleInterpolator: forFade }}
          />

          {/* Lesson flow (full-screen, no tab bar) */}
          <Stack.Screen name="LessonFlow" component={LessonFlowScreen} />
          <Stack.Screen
            name="LessonComplete"
            component={LessonCompleteScreen}
            options={{ cardStyleInterpolator: forFade }}
          />

          {/* Recipe flow */}
          <Stack.Screen name="RecipeIntro" component={RecipeIntroScreen} />
          <Stack.Screen name="RecipeIngredients" component={RecipeIngredientsScreen} />
          <Stack.Screen name="RecipeStep" component={RecipeStepScreen} />
          <Stack.Screen name="RecipePhoto" component={RecipePhotoScreen} />
          <Stack.Screen name="RecipeFeedbackLoading" component={RecipeFeedbackLoadingScreen} />
          <Stack.Screen
            name="RecipeFeedback"
            component={RecipeFeedbackScreen}
            options={{ cardStyleInterpolator: forFade }}
          />

          {/* Mission flow */}
          <Stack.Screen name="MissionDetail" component={MissionDetailScreen} />
          <Stack.Screen
            name="MissionFeedback"
            component={MissionFeedbackScreen}
            options={{ cardStyleInterpolator: forFade }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_700Bold,
    BeVietnamPro_400Regular,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  })

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppNavigator fontsLoaded={fontsLoaded ?? false} />
          </NavigationContainer>
        </SafeAreaProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  )
}
