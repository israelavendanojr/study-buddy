import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useScreenTransition } from '../../hooks/useScreenTransition';
import MissionPhotoFeedbackScreen, { MissionPhotoFeedbackContent } from './MissionPhotoFeedbackScreen';
import MissionPhotoLoadingScreen from './MissionPhotoLoadingScreen';
import MissionPhotoSubmissionScreen, { MissionPhotoSubmissionContent } from './MissionPhotoSubmissionScreen';

interface MissionFlowScreenProps {
  onClose: () => void;
}

type MissionStepHandlers = {
  onNext: () => void;
  onClose: () => void;
};

type MissionStep = {
  key: string;
  render: (h: MissionStepHandlers) => React.ReactElement;
};

// ─── Mission content ────────────────────────────────────────────────────────────

const SUBMISSION: MissionPhotoSubmissionContent = {
  title: 'Plate and Submit.',
  instruction: 'Dice the onion into uniform pieces. Plate it on a cutting board and show your work.',
  gradingCriteria: [
    'Uniform dice size (consistent cubes)',
    'Clean straight cuts, no mashing',
    'No large uncut pieces remaining',
  ],
  gradingNote: 'Take the photo in good light. Be proud of this.',
  submitHint: 'We will review your photo and give specific feedback.',
};

const FEEDBACK: MissionPhotoFeedbackContent = {
  title: 'Dice an Onion',
  gradingResults: [
    { label: 'Uniform dice size (consistent cubes)', score: 4 },
    { label: 'Clean straight cuts, no mashing', score: 4 },
    { label: 'No large uncut pieces remaining', score: 4 },
  ],
  maxScorePerCriterion: 5,
  totalScore: 12,
  maxTotalScore: 15,
  xpEarned: 250,
};

// ─── Flow steps ─────────────────────────────────────────────────────────────────

const MISSION_FLOW: MissionStep[] = [
  {
    key: 'submission',
    render: ({ onNext, onClose }) => (
      <MissionPhotoSubmissionScreen content={SUBMISSION} onNext={onNext} onClose={onClose} />
    ),
  },
  {
    key: 'loading',
    render: ({ onNext }) => (
      <MissionPhotoLoadingScreen onContinue={onNext} />
    ),
  },
  {
    key: 'feedback',
    render: ({ onClose }) => (
      <MissionPhotoFeedbackScreen content={FEEDBACK} onClose={onClose} />
    ),
  },
];

// ─── Orchestrator ────────────────────────────────────────────────────────────────

export default function MissionFlowScreen({ onClose }: MissionFlowScreenProps) {
  const { index: step, prevIndex: prevStep, isTransitioning, navigate, incomingStyle, outgoingStyle } = useScreenTransition();

  const handleNext = () => navigate(step + 1, 'forward');

  const current = MISSION_FLOW[step];
  const prev = prevStep !== null ? MISSION_FLOW[prevStep] : null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Outgoing screen — only visible during transition */}
      {isTransitioning && prev && prevStep !== null && (
        <Animated.View style={[StyleSheet.absoluteFillObject, outgoingStyle]}>
          {prev.render({ onNext: handleNext, onClose })}
        </Animated.View>
      )}

      {/* Incoming / current screen */}
      <Animated.View style={[StyleSheet.absoluteFillObject, isTransitioning && incomingStyle]}>
        {current.render({ onNext: handleNext, onClose })}
      </Animated.View>
    </View>
  );
}
