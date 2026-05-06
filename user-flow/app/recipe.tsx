import { useRouter } from 'expo-router';
import RecipeFlowScreen from '../src/screens/recipe/RecipeFlowScreen';

export default function RecipeRoute() {
  const router = useRouter();
  return <RecipeFlowScreen onClose={() => router.back()} />;
}
