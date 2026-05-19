import { useRouter } from 'expo-router';
import OnboardingFlow from '../src/screens/onboarding/OnboardingFlow';

export default function OnboardingRoute() {
  const router = useRouter();

  return <OnboardingFlow onComplete={() => router.replace('/(tabs)')} onSignIn={() => router.push('/sign-in')} />;
}
