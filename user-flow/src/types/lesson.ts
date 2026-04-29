import { ImageSourcePropType } from 'react-native';

export interface ConceptContent {
  quote: { before: string; highlight: string; after: string };
  whyItMatters: string;
  proTip: string;
}

export interface MultipleChoiceData {
  text: string;
  options: { id: string; text: string }[];
  correctId: string;
}

export interface FillBlankData {
  prompt: string;
  sentenceBefore: string;
  sentenceAfter: string;
  correctToken: string;
  tokens: string[];
}

export interface ImageIDOption {
  id: string;
  label: string;
  image: ImageSourcePropType;
}

export interface ImageIDData {
  text: string;
  options: ImageIDOption[];
  correctId: string;
}

export interface SequenceData {
  steps: string[];
}

export interface LessonCompleteData {
  lessonTitle: string;
  chapterLabel: string;
  xp: number;
  timeSeconds: number;
  accuracy: number;
  streakDays: number;
  streakNextBadgeDays: number;
  missionTitle: string;
  missionDescription: string;
}
