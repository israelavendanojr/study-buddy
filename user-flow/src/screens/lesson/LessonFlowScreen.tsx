import React, { useState } from 'react';
import ConceptBeatScreen from './ConceptBeatScreen';

interface LessonFlowScreenProps {
  onClose: () => void;
}

const TOTAL_CARDS = 5;

export default function LessonFlowScreen({ onClose }: LessonFlowScreenProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < TOTAL_CARDS - 1) {
      setStep(s => s + 1);
    }
  };

  return (
    <ConceptBeatScreen
      currentCard={step + 1}
      totalCards={TOTAL_CARDS}
      onNext={handleNext}
      onClose={onClose}
    />
  );
}
