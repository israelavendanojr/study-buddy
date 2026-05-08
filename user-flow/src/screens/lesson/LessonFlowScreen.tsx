import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProgressBar from '../../components/ProgressBar';
import { useScreenTransition } from '../../hooks/useScreenTransition';
import {
  ConceptContent,
  FillBlankData,
  ImageIDData,
  LessonCompleteData,
  MultipleChoiceData,
  SequenceData,
} from '../../types/lesson';
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

// ─── Lesson content ───────────────────────────────────────────────────────────

const CONCEPT_1: ConceptContent = {
  quote: {
    before: '"The pan needs to be hot before the oil goes in. Not warm. ',
    highlight: 'Hot.',
    after: " You're looking for the oil to shimmer and just start smoking at the edges.\"",
  },
  whyItMatters: 'Cold pan = no crust. Protein sticks, tears, and steams instead of searing.',
  proTip: 'Use oil with a high smoke point, like grapeseed or avocado oil!',
};

const CONCEPT_2: ConceptContent = {
  quote: {
    before: '"Moisture is the enemy of a crust. The Maillard reaction only happens above 280°F — and water keeps your surface at ',
    highlight: '212°F',
    after: ' until it evaporates."',
  },
  whyItMatters: 'Pat your protein dry. Every time. Wet surfaces steam instead of sear — no crust, no color.',
  proTip: 'Press your protein between paper towels for 30 seconds before hitting the pan.',
};

const MULTIPLE_CHOICE: MultipleChoiceData = {
  text: 'You add chicken to a hot pan and hear a loud aggressive sizzle. What does this mean?',
  options: [
    { id: 'A', text: 'The pan is too hot' },
    { id: 'B', text: 'The pan is at the right temperature' },
    { id: 'C', text: 'You need more oil' },
    { id: 'D', text: 'The chicken needs more time to dry' },
  ],
  correctId: 'B',
};

const FILL_BLANK: FillBlankData = {
  prompt: 'Complete the sentence with the correct term.',
  sentenceBefore: 'The Maillard reaction requires temperatures above',
  sentenceAfter: ', which is why wet surfaces prevent browning.',
  correctToken: '280°F',
  tokens: ['280°F', '212°F', '350°F', '165°F'],
};

const IMAGE_ID: ImageIDData = {
  text: 'Which image shows a proper sear in progress?',
  options: [
    {
      id: 'A',
      label: 'PALE, STEAMING SURFACE',
      image: require('../../../assets/sear_images/steam.jpeg'),
    },
    {
      id: 'B',
      label: 'GOLDEN BROWN CRUST',
      image: require('../../../assets/sear_images/Sear.jpg'),
    },
    {
      id: 'C',
      label: 'BURNT DARK EDGES',
      image: require('../../../assets/sear_images/burnt.jpg'),
    },
  ],
  correctId: 'B',
};

const SEQUENCE: SequenceData = {
  steps: [
    'Heat the pan',
    'Add oil',
    'Pat chicken dry',
    'Add chicken to pan',
    "Don't move it",
    'Flip once',
  ],
};

const LESSON_COMPLETE: LessonCompleteData = {
  lessonTitle: 'Searing Chicken',
  chapterLabel: 'Chapter 1',
  xp: 120,
  timeSeconds: 402,
  accuracy: 85,
  streakDays: 12,
  streakNextBadgeDays: 15,
  missionTitle: 'Mission Unlocked: Sear a piece of chicken',
  missionDescription: 'Put your theory into practice in the real world.',
};

// ─── Lesson flow ──────────────────────────────────────────────────────────────

// Reorder, add, or remove entries here to change the lesson flow.
// Step numbers and total count are derived automatically.
const LESSON_FLOW: LessonStep[] = [
  {
    key: 'concept-1',
    render: ({ onNext }) => <ConceptBeatScreen content={CONCEPT_1} onNext={onNext} />,
  },
  {
    key: 'multiple-choice',
    render: ({ onNext }) => <MultipleChoiceScreen question={MULTIPLE_CHOICE} onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'concept-2',
    render: ({ onNext }) => <ConceptBeatScreen content={CONCEPT_2} onNext={onNext} />,
  },
  {
    key: 'fill-blank',
    render: ({ onNext }) => <FillBlankScreen activity={FILL_BLANK} onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'image-id',
    render: ({ onNext }) => <ImageIDScreen question={IMAGE_ID} onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'sequence',
    render: ({ onNext }) => <SequenceScreen data={SEQUENCE} onNext={onNext} onSkip={onNext} />,
  },
  {
    key: 'complete',
    showProgress: false,
    render: ({ onClose }) => <LessonCompleteScreen data={LESSON_COMPLETE} onContinue={onClose} />,
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
