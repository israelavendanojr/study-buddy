import LoadingScreen from '../../components/LoadingScreen';

interface RecipePhotoLoadingScreenProps {
  onContinue: () => void;
}

export default function RecipePhotoLoadingScreen({ onContinue }: RecipePhotoLoadingScreenProps) {
  return (
    <LoadingScreen
      headline="Grading your photo submission..."
      bodyPrefix="Providing feedback based on "
      keywords={['crust', 'interior', 'sauce']}
      bodySuffix="."
      onContinue={onContinue}
      duration={4000}
    />
  );
}
