import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import OnboardingFlow from '../src/screens/onboarding/OnboardingFlow';
import { ONBOARDING_KEY } from './_layout';

export default function OnboardingRoute() {
  const router = useRouter();

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
