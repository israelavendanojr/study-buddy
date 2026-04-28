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

type LessonStepHandlers = {
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onClose: () => void;
};

type LessonStep = {
  key: string;
  render: (h: LessonStepHandlers) => React.ReactElement;
};

const CONCEPT_2 = {
  quote: {
    before: '"Moisture is the enemy of a crust. The Maillard reaction only happens above 280°F — and water keeps your surface at ',
    highlight: '212°F',
    after: ' until it evaporates."',
  },
  whyItMatters: 'Pat your protein dry. Every time. Wet surfaces steam instead of sear — no crust, no color.',
  proTip: 'Press your protein between paper towels for 30 seconds before hitting the pan.',
};

// Reorder, add, or remove entries here to change the lesson flow.
// Step numbers and total count are derived automatically.
const LESSON_FLOW: LessonStep[] = [
  {
    key: 'concept-1',
    render: ({ stepIndex, totalSteps, onNext, onClose }) => (
      <ConceptBeatScreen currentCard={stepIndex + 1} totalCards={totalSteps} onNext={onNext} onClose={onClose} />
    ),
  },
  {
    key: 'multiple-choice',
    render: ({ stepIndex, totalSteps, onNext, onClose }) => (
      <MultipleChoiceScreen currentStep={stepIndex + 1} totalSteps={totalSteps} onNext={onNext} onClose={onClose} onSkip={onNext} />
    ),
  },
  {
    key: 'concept-2',
    render: ({ stepIndex, totalSteps, onNext, onClose }) => (
      <ConceptBeatScreen currentCard={stepIndex + 1} totalCards={totalSteps} content={CONCEPT_2} onNext={onNext} onClose={onClose} />
    ),
  },
  {
    key: 'fill-blank',
    render: ({ stepIndex, totalSteps, onNext, onClose }) => (
      <FillBlankScreen currentStep={stepIndex + 1} totalSteps={totalSteps} onNext={onNext} onClose={onClose} onSkip={onNext} />
    ),
  },
  {
    key: 'image-id',
    render: ({ stepIndex, totalSteps, onNext, onClose }) => (
      <ImageIDScreen currentStep={stepIndex + 1} totalSteps={totalSteps} onNext={onNext} onClose={onClose} onSkip={onNext} />
    ),
  },
  {
    key: 'sequence',
    render: ({ stepIndex, totalSteps, onNext, onClose }) => (
      <SequenceScreen currentStep={stepIndex + 1} totalSteps={totalSteps} onNext={onNext} onClose={onClose} onSkip={onNext} />
    ),
  },
  {
    key: 'complete',
    render: ({ onClose }) => <LessonCompleteScreen onContinue={onClose} />,
  },
];

// Exclude the completion screen from the progress count
const ACTIVITY_STEP_COUNT = LESSON_FLOW.length - 1;

export default function LessonFlowScreen({ onClose }: LessonFlowScreenProps) {
  const [step, setStep] = useState(0);
  const handleNext = () => setStep(s => s + 1);
  const current = LESSON_FLOW[step];
  return current.render({ stepIndex: step, totalSteps: ACTIVITY_STEP_COUNT, onNext: handleNext, onClose });
}
