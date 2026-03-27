import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one'
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

import LoadingScreen from './src/screens/LoadingScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import BuddyNamingScreen from './src/screens/BuddyNamingScreen'
import GoalTuningScreen from './src/screens/GoalTuningScreen'
import ConfirmationScreen from './src/screens/ConfirmationScreen'
import RoadmapScreen from './src/screens/RoadmapScreen'
import HomeScreen from './src/screens/HomeScreen'
import BadgesScreen from './src/screens/BadgesScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import SignInScreen from './src/screens/SignInScreen'
import SignUpScreen from './src/screens/SignUpScreen'

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
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="BuddyNaming" component={BuddyNamingScreen} />
          <Stack.Screen name="GoalTuning" component={GoalTuningScreen} />
          <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
          <Stack.Screen name="Roadmap" component={RoadmapScreen} options={{ cardStyleInterpolator: forFade }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ cardStyleInterpolator: forFade }} />
          <Stack.Screen name="Badges" component={BadgesScreen} options={{ cardStyleInterpolator: forFade }} />
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
