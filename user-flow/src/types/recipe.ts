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
