import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProgressBar from '../../components/ProgressBar';
import { useScreenTransition } from '../../hooks/useScreenTransition';
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
  onNext: () => void;
  onClose: () => void;
};

type LessonStep = {
  key: string;
  showProgress?: boolean;
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
    render: ({ onNext }) => <ConceptBeatScreen onNext={onNext} />,
  },
  {
    key: 'multiple-choice',
    render: ({ onNext }) => <MultipleChoiceScreen onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'concept-2',
    render: ({ onNext }) => <ConceptBeatScreen content={CONCEPT_2} onNext={onNext} />,
  },
  {
    key: 'fill-blank',
    render: ({ onNext }) => <FillBlankScreen onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'image-id',
    render: ({ onNext }) => <ImageIDScreen onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'sequence',
    render: ({ onNext }) => <SequenceScreen onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'complete',
    showProgress: false,
    render: ({ onClose }) => <LessonCompleteScreen onContinue={onClose} />,
  },
];

// Exclude the completion screen from the progress count
const ACTIVITY_STEP_COUNT = LESSON_FLOW.filter(s => s.showProgress !== false).length;

export default function LessonFlowScreen({ onClose }: LessonFlowScreenProps) {
  const { index: step, prevIndex: prevStep, isTransitioning, navigate, incomingStyle, outgoingStyle } = useScreenTransition();
  const insets = useSafeAreaInsets();

  const handleNext = () => navigate(step + 1, 'forward');
  const handleBack = () => step > 0 ? navigate(step - 1, 'back') : onClose();

  const current = LESSON_FLOW[step];
  const prev = prevStep !== null ? LESSON_FLOW[prevStep] : null;
  const showProgress = current.showProgress !== false;
  const progress = step / ACTIVITY_STEP_COUNT;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Outgoing screen — only visible during transition */}
      {isTransitioning && prev && prevStep !== null && (
        <Animated.View style={[StyleSheet.absoluteFillObject, outgoingStyle]}>
          {prev.render({ onNext: handleNext, onClose })}
        </Animated.View>
      )}

      {/* Incoming / current screen */}
      <Animated.View style={[
        StyleSheet.absoluteFillObject,
        isTransitioning && incomingStyle,
      ]}>
        {current.render({ onNext: handleNext, onClose })}
      </Animated.View>

      {/* Progress bar overlay — persists across transitions */}
      {showProgress && (
        <View style={[styles.progressOverlay, { top: insets.top }]}>
          <ProgressBar
            progress={progress}
            onBack={handleBack}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
