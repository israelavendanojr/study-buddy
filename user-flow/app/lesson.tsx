import { useRouter } from 'expo-router';
import LessonFlowScreen from '../src/screens/lesson/LessonFlowScreen';

export default function LessonRoute() {
  const router = useRouter();
  return <LessonFlowScreen onClose={() => router.back()} />;
}
