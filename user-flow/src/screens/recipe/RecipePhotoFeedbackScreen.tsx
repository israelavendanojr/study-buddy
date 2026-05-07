import React from 'react';
import PhotoFeedbackScreen from '../../components/PhotoFeedbackScreen';
import RecipeStepIndicator from '../../components/RecipeStepIndicator';
import { RecipePhotoFeedbackContent } from '../../types/recipe';

interface RecipePhotoFeedbackScreenProps {
  content: RecipePhotoFeedbackContent;
  onBack: () => void;
  onClose: () => void;
}

export default function RecipePhotoFeedbackScreen({
  content,
  onBack,
  onClose,
}: RecipePhotoFeedbackScreenProps) {
  return (
    <PhotoFeedbackScreen
      flowTitle="RECIPE CHALLENGE"
      timeMinutes={content.timeMinutes}
      stepIndicator={
        <RecipeStepIndicator
          stepCount={content.stepCount}
          currentStep={content.stepCount + 2}
          showCameraFinal
        />
      }
      photoSource={require('../../../assets/submissions/pan_sear_chicken_2.jpg')}
      title={content.title}
      gradingResults={content.gradingResults}
      maxScorePerCriterion={content.maxScorePerCriterion}
      totalScore={content.totalScore}
      maxTotalScore={content.maxTotalScore}
      xpEarned={content.xpEarned}
      xpLabel="RECIPE COMPLETE"
      primaryButtonLabel="BACK TO ROADMAP →"
      onLeft={onBack}
      onPrimary={onClose}
    />
  );
}
