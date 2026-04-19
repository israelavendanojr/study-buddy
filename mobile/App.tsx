import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one'
import { Fredoka_400Regular, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka'
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import type { StackCardStyleInterpolator } from '@react-navigation/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View } from 'react-native'
import { colors } from './src/theme'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import * as SecureStore from 'expo-secure-store'

import LoadingScreen from './src/screens/auth/LoadingScreen'
import SignInScreen from './src/screens/auth/SignInScreen'
import SignUpScreen from './src/screens/auth/SignUpScreen'
import GoalSelectionScreen from './src/screens/onboarding/GoalSelectionScreen'
import ExperienceScreen from './src/screens/onboarding/ExperienceScreen'
import CommitmentScreen from './src/screens/onboarding/CommitmentScreen'
import GradingScreen from './src/screens/onboarding/GradingScreen'
import CoachingScreen from './src/screens/onboarding/CoachingScreen'
import GoalConfirmationScreen from './src/screens/onboarding/GoalConfirmationScreen'
import HomeScreen from './src/screens/main/HomeScreen'
import SettingsScreen from './src/screens/main/SettingsScreen'
import RoadmapScreen from './src/screens/roadmap/RoadmapScreen'
import LessonScreen from './src/screens/roadmap/LessonScreen'
import ProfileScreen from './src/screens/main/ProfileScreen'

const CLERK_PUBLISHABLE_KEY = 'pk_test_ZXhjaXRlZC1wb255LTQxLmNsZXJrLmFjY291bnRzLmRldiQ'

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key)
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value)
  },
}

const Stack = createStackNavigator()

const forFade: StackCardStyleInterpolator = ({ current }) => ({
  cardStyle: { opacity: current.progress },
})

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
          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
          <Stack.Screen name="Experience" component={ExperienceScreen} />
          <Stack.Screen name="Commitment" component={CommitmentScreen} />
          <Stack.Screen name="Grading" component={GradingScreen} />
          <Stack.Screen name="Coaching" component={CoachingScreen} />
          <Stack.Screen name="GoalConfirmation" component={GoalConfirmationScreen} />
          <Stack.Screen name="Roadmap" component={RoadmapScreen} options={{ cardStyleInterpolator: forFade }} />
          <Stack.Screen name="LessonScreen" component={LessonScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ cardStyleInterpolator: forFade }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ cardStyleInterpolator: forFade }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ cardStyleInterpolator: forFade }} />
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
    FredokaOne_400Regular,
    Fredoka_400Regular,
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  })

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator fontsLoaded={fontsLoaded} />
        </NavigationContainer>
      </SafeAreaProvider>
    </ClerkProvider>
  )
}
