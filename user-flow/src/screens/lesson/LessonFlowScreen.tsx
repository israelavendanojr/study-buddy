import React, { useState } from 'react';
import ConceptBeatScreen from './ConceptBeatScreen';
import FillBlankScreen from './FillBlankScreen';
import ImageIDScreen from './ImageIDScreen';
import LessonCompleteScreen from './LessonCompleteScreen';
import MultipleChoiceScreen from './MultipleChoiceScreen';
import SequenceScreen from './SequenceScreen';

interface LessonFlowScreenProps {
  onClose: () => void;
}

const TOTAL_STEPS = 6;

const CONCEPT_2 = {
  quote: {
    before: '"Moisture is the enemy of a crust. The Maillard reaction only happens above 280°F — and water keeps your surface at ',
    highlight: '212°F',
    after: ' until it evaporates."',
  },
  whyItMatters: 'Pat your protein dry. Every time. Wet surfaces steam instead of sear — no crust, no color.',
  proTip: 'Press your protein between paper towels for 30 seconds before hitting the pan.',
};

export default function LessonFlowScreen({ onClose }: LessonFlowScreenProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    setStep(s => s + 1);
  };

  if (step === 0) {
    return (
      <ConceptBeatScreen
        currentCard={1}
        totalCards={TOTAL_STEPS}
        onNext={handleNext}
        onClose={onClose}
      />
    );
  }

  if (step === 1) {
    return (
      <MultipleChoiceScreen
        currentStep={2}
        totalSteps={TOTAL_STEPS}
        onNext={handleNext}
        onClose={onClose}
        onSkip={handleNext}
      />
    );
  }

  if (step === 2) {
    return (
      <ConceptBeatScreen
        currentCard={3}
        totalCards={TOTAL_STEPS}
        content={CONCEPT_2}
        onNext={handleNext}
        onClose={onClose}
      />
    );
  }

  if (step === 3) {
    return (
      <FillBlankScreen
        currentStep={4}
        totalSteps={TOTAL_STEPS}
        onNext={handleNext}
        onClose={onClose}
        onSkip={handleNext}
      />
    );
  }

  if (step === 4) {
    return (
      <ImageIDScreen
        currentStep={5}
        totalSteps={TOTAL_STEPS}
        onNext={handleNext}
        onClose={onClose}
        onSkip={handleNext}
      />
    );
  }

  if (step === 5) {
    return (
      <SequenceScreen
        currentStep={6}
        totalSteps={TOTAL_STEPS}
        onNext={handleNext}
        onClose={onClose}
        onSkip={handleNext}
      />
    );
  }

  return <LessonCompleteScreen onContinue={onClose} />;
}
