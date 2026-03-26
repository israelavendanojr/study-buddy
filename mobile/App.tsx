import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one'
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View } from 'react-native'
import { colors } from './src/theme'

import OnboardingScreen from './src/screens/OnboardingScreen'
import BuddyNamingScreen from './src/screens/BuddyNamingScreen'
import GoalTuningScreen from './src/screens/GoalTuningScreen'
import ConfirmationScreen from './src/screens/ConfirmationScreen'
import RoadmapScreen from './src/screens/RoadmapScreen'

const Stack = createStackNavigator()

export default function App() {
  const [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  })

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="BuddyNaming" component={BuddyNamingScreen} />
          <Stack.Screen name="GoalTuning" component={GoalTuningScreen} />
          <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
          <Stack.Screen name="Roadmap" component={RoadmapScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
