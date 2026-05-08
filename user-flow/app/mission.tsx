import { useRouter } from 'expo-router';
import MissionFlowScreen from '../src/screens/kitchen/MissionFlowScreen';

export default function MissionRoute() {
  const router = useRouter();
  return <MissionFlowScreen onClose={() => router.back()} />;
}
