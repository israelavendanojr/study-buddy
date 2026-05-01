import LoadingScreen from '../../components/LoadingScreen';
import { OnboardingScreenProps } from './types';

export default function RoadmapLoadingScreen({ onContinue }: OnboardingScreenProps) {
  return (
    <LoadingScreen
      headline={'Building your unique\nroadmap...'}
      bodyPrefix="Curating lessons based on your "
      keywords={['goals', 'experience', 'time', 'grading mode', 'commitment']}
      bodySuffix="."
      onContinue={onContinue}
      duration={9000}
    />
  );
}
