import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useScreenTransition } from '../../hooks/useScreenTransition';
import { RecipeIngredientsContent, RecipeIntroContent } from '../../types/recipe';
import RecipeIngredientsScreen from './RecipeIngredientsScreen';
import RecipeIntroScreen from './RecipeIntroScreen';

interface RecipeFlowScreenProps {
  onClose: () => void;
}

type RecipeStepHandlers = {
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
};

type RecipeStep = {
  key: string;
  showProgress?: boolean;
  render: (h: RecipeStepHandlers) => React.ReactElement;
};

// ─── Recipe content ────────────────────────────────────────────────────────────

const INTRO: RecipeIntroContent = {
  chapterLabel: 'CHAPTER 1 · RECIPE CHALLENGE',
  title: 'Pan-Seared Chicken with Pan Sauce',
  description: 'You know the techniques — now prove it in the kitchen.',
  skills: [
    'Proper searing technique and heat control',
    'Reading the pan — shimmer, sound, release',
    'Deglazing and building a pan sauce',
    'Reduction and butter mounting',
  ],
  tipQuote: 'Read every step before you touch the stove. Mise en place first, always.',
  timeMinutes: 25,
  photo: require('../../../assets/recipes/pan_sear_chicken.jpg'),
};

const INGREDIENTS: RecipeIngredientsContent = {
  ingredients: [
    { text: '2 chicken breasts' },
    { text: '1 tbsp neutral oil' },
    { text: '2 tbsp butter' },
    { text: '½ cup chicken stock' },
    { text: '1 shallot, minced' },
    { text: 'Salt and pepper' },
    { text: 'Fresh thyme', optional: true },
  ],
  tip: 'Have everything prepped and measured before you turn on the heat.',
  stepCount: 6,
  timeMinutes: 25,
};

// ─── Recipe flow ───────────────────────────────────────────────────────────────

// Reorder, add, or remove entries here to change the recipe flow.
const RECIPE_FLOW: RecipeStep[] = [
  {
    key: 'intro',
    showProgress: false,
    render: ({ onNext, onClose }) => (
      <RecipeIntroScreen content={INTRO} onNext={onNext} onClose={onClose} />
    ),
  },
  {
    key: 'ingredients',
    showProgress: false,
    render: ({ onNext, onBack, onClose }) => (
      <RecipeIngredientsScreen content={INGREDIENTS} onNext={onNext} onBack={onBack} onClose={onClose} />
    ),
  },
];


export default function RecipeFlowScreen({ onClose }: RecipeFlowScreenProps) {
  const { index: step, prevIndex: prevStep, isTransitioning, navigate, incomingStyle, outgoingStyle } = useScreenTransition();

  const handleNext = () => navigate(step + 1, 'forward');
  const handleBack = () => step > 0 ? navigate(step - 1, 'back') : onClose();

  const current = RECIPE_FLOW[step];
  const prev = prevStep !== null ? RECIPE_FLOW[prevStep] : null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Outgoing screen — only visible during transition */}
      {isTransitioning && prev && prevStep !== null && (
        <Animated.View style={[StyleSheet.absoluteFillObject, outgoingStyle]}>
          {prev.render({ onNext: handleNext, onBack: handleBack, onClose })}
        </Animated.View>
      )}

      {/* Incoming / current screen */}
      <Animated.View style={[
        StyleSheet.absoluteFillObject,
        isTransitioning && incomingStyle,
      ]}>
        {current.render({ onNext: handleNext, onBack: handleBack, onClose })}
      </Animated.View>
    </View>
  );
}

