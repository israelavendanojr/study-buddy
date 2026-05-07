import React from 'react';
import PhotoFeedbackScreen from '../../components/PhotoFeedbackScreen';
import { CriterionResult } from '../../types/recipe';

export interface MissionPhotoFeedbackContent {
  title: string;
  gradingResults: CriterionResult[];
  maxScorePerCriterion: number;
  totalScore: number;
  maxTotalScore: number;
  xpEarned: number;
}

interface Props {
  content: MissionPhotoFeedbackContent;
  onClose: () => void;
}

export default function MissionPhotoFeedbackScreen({ content, onClose }: Props) {
  return (
    <PhotoFeedbackScreen
      flowTitle="MISSION"
      photoSource={require('../../../assets/submissions/dice-onion.jpg')}
      title={content.title}
      gradingResults={content.gradingResults}
      maxScorePerCriterion={content.maxScorePerCriterion}
      totalScore={content.totalScore}
      maxTotalScore={content.maxTotalScore}
      xpEarned={content.xpEarned}
      xpLabel="MISSION COMPLETE"
      primaryButtonLabel="BACK TO KITCHEN →"
      onLeft={onClose}
      onPrimary={onClose}
    />
  );
}
