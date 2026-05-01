import { ImageSourcePropType } from 'react-native';

export interface RecipeIntroContent {
  chapterLabel: string;
  title: string;
  description: string;
  skills: string[];
  tipQuote: string;
  timeMinutes: number;
  photo: ImageSourcePropType;
}

export interface Ingredient {
  text: string;
  optional?: boolean;
}

export interface RecipeIngredientsContent {
  ingredients: Ingredient[];
  tip: string;
  stepCount: number;
  timeMinutes: number;
}

export interface RecipeStepCheckpoint {
  question: string;
  options: string[];
  correctIndex: number; // 0-based
}

export interface RecipeStepContent {
  stepNumber: number;     // 1-based, shown as "STEP N"
  stepCount: number;      // total cooking steps
  title: string;
  instruction: string;
  whatToLookFor?: string;
  suggestedTime?: string; // e.g. "90 SEC", "10-14 MIN"
  checkpoint?: RecipeStepCheckpoint;
  timeMinutes: number;    // for RecipeHeader
}

export interface RecipePhotoSubmissionContent {
  stepNumber: number;       // shown in StepBadge as "STEP N"
  stepCount: number;        // total cooking steps (for indicator)
  title: string;
  instruction: string;
  gradingCriteria: string[];
  gradingNote: string;      // italic footer inside grading card
  submitHint: string;       // text below submit button
  timeMinutes: number;      // for RecipeHeader
}
