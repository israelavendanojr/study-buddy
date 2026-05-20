import { useRouter } from 'expo-router';
import SignInScreen from '../src/screens/auth/SignInScreen';

export default function SignInRoute() {
  const router = useRouter();
  return <SignInScreen onBack={() => router.back()} onSuccess={() => router.replace('/(tabs)')} />;
}
