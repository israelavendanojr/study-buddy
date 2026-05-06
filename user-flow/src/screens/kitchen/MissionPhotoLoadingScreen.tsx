import LoadingScreen from '../../components/LoadingScreen';

interface Props {
  onContinue: () => void;
  keywords?: string[];
}

export default function MissionPhotoLoadingScreen({ onContinue, keywords = ['cuts', 'size', 'technique'] }: Props) {
  return (
    <LoadingScreen
      headline="Grading your photo submission..."
      bodyPrefix="Providing feedback based on "
      keywords={keywords}
      bodySuffix="."
      onContinue={onContinue}
      duration={4000}
    />
  );
}
