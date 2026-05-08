import React from 'react';
import PhotoSubmissionScreen from '../../components/PhotoSubmissionScreen';

export interface MissionPhotoSubmissionContent {
  title: string;
  instruction: string;
  gradingCriteria: string[];
  gradingNote: string;
  submitHint: string;
}

interface Props {
  content: MissionPhotoSubmissionContent;
  onNext: () => void;
  onClose: () => void;
}

export default function MissionPhotoSubmissionScreen({ content, onNext, onClose }: Props) {
  return (
    <PhotoSubmissionScreen
      flowTitle="MISSION"
      title={content.title}
      instruction={content.instruction}
      gradingCriteria={content.gradingCriteria}
      gradingNote={content.gradingNote}
      submitHint={content.submitHint}
      notesMultiline
      notePlaceholder="Any notes about your cook — what went well, what was tricky..."
      onNext={onNext}
      onLeft={onClose}
    />
  );
}
