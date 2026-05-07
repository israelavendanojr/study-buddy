import React from 'react';
import PhotoSubmissionScreen from '../../components/PhotoSubmissionScreen';
import RecipeStepIndicator from '../../components/RecipeStepIndicator';
import { RecipePhotoSubmissionContent } from '../../types/recipe';

interface RecipePhotoSubmissionScreenProps {
  content: RecipePhotoSubmissionContent;
  onNext: () => void;
  onBack: () => void;
}

export default function RecipePhotoSubmissionScreen({
  content,
  onNext,
  onBack,
}: RecipePhotoSubmissionScreenProps) {
  return (
    <PhotoSubmissionScreen
      flowTitle="RECIPE CHALLENGE"
      timeMinutes={content.timeMinutes}
      stepIndicator={
        <RecipeStepIndicator
          stepCount={content.stepCount}
          currentStep={content.stepCount + 1}
          showCameraFinal
        />
      }
      stepBadgeLabel={`STEP ${content.stepNumber}`}
      title={content.title}
      instruction={content.instruction}
      gradingCriteria={content.gradingCriteria}
      gradingNote={content.gradingNote}
      submitHint={content.submitHint}
      onNext={onNext}
      onLeft={onBack}
    />
  );
}
