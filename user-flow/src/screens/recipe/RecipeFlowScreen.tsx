import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useScreenTransition } from '../../hooks/useScreenTransition';
import { RecipeIngredientsContent, RecipeIntroContent, RecipeStepContent } from '../../types/recipe';
import RecipeIngredientsScreen from './RecipeIngredientsScreen';
import RecipeIntroScreen from './RecipeIntroScreen';
import RecipeStepScreen from './RecipeStepScreen';

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
  stepCount: 4,
  timeMinutes: 25,
};

const STEP_1: RecipeStepContent = {
  stepNumber: 1,
  stepCount: 4,
  title: 'Get the Pan Ready',
  instruction: 'Heavy pan over medium-high heat. No oil yet. Let it heat for 90 seconds. Add your oil and wait for the shimmer. You\'ll know it\'s ready when a drop of water flicked in dances and evaporates immediately.',
  whatToLookFor: 'Oil shimmering, barely starting to smoke at the edges. Not a moment before.',
  suggestedTime: '90 SEC',
  timeMinutes: 25,
};

const STEP_2: RecipeStepContent = {
  stepNumber: 2,
  stepCount: 4,
  title: 'The Sear',
  instruction: 'Lay the chicken away from you into the pan. You want an aggressive sizzle. If it\'s quiet, your pan wasn\'t hot enough — leave it anyway and let the surface dry out.\n\nDo not move it. Set a timer for 5 minutes and walk away. You\'re listening for the sizzle to stay consistent, not fade into a steam.',
  suggestedTime: '5 MIN',
  checkpoint: {
    question: 'Your chicken has been in the pan for 3 minutes and the sizzle has gone quiet and steamy. What happened and what do you do?',
    options: [
      'The pan cooled down from the cold chicken — turn up the heat slightly and wait',
      'It\'s done, flip it',
      'Add more oil',
    ],
    correctIndex: 0,
  },
  timeMinutes: 25,
};

const STEP_3: RecipeStepContent = {
  stepNumber: 3,
  stepCount: 4,
  title: 'The Flip',
  instruction: 'When the chicken releases cleanly from the pan without forcing, it\'s ready to flip. If it\'s sticking, it\'s not ready. Another 60 seconds and try again. Sear the second side for 4 minutes. Remove chicken and rest it on a plate tented loosely with foil.',
  whatToLookFor: 'Clean release, golden brown underside, internal temp approaching 165°F.',
  suggestedTime: '10-14 MIN',
  checkpoint: {
    question: 'Why do we rest the chicken before cutting?',
    options: [
      'So it looks better on the plate',
      'Resting allows proteins to relax and reabsorb juices that were pushed to the center during cooking',
      'It continues cooking and needs time to finish',
    ],
    correctIndex: 1,
  },
  timeMinutes: 25,
};

const STEP_4: RecipeStepContent = {
  stepNumber: 4,
  stepCount: 4,
  title: 'The Pan Sauce',
  instruction: 'Don\'t touch that fond. Lower heat to medium. Add shallots directly to the pan and cook 60 seconds until soft. Pour in stock and scrape up every bit of fond from the bottom — this is flavor. Let it reduce by half, about 2 minutes. Pull off heat, swirl in cold butter until glossy.\n\nTaste it. Add salt if it needs it.',
  checkpoint: {
    question: 'Your sauce looks thin and watery after adding the stock. What do you do?',
    options: [
      'Add flour to thicken it',
      'Keep reducing — time and heat will concentrate the flavor and thicken it naturally',
      'Start over',
    ],
    correctIndex: 1,
  },
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
  {
    key: 'step-1',
    render: ({ onNext, onBack, onClose }) => (
      <RecipeStepScreen content={STEP_1} onNext={onNext} onBack={onBack} onClose={onClose} />
    ),
  },
  {
    key: 'step-2',
    render: ({ onNext, onBack, onClose }) => (
      <RecipeStepScreen content={STEP_2} onNext={onNext} onBack={onBack} onClose={onClose} />
    ),
  },
  {
    key: 'step-3',
    render: ({ onNext, onBack, onClose }) => (
      <RecipeStepScreen content={STEP_3} onNext={onNext} onBack={onBack} onClose={onClose} />
    ),
  },
  {
    key: 'step-4',
    render: ({ onNext, onBack, onClose }) => (
      <RecipeStepScreen content={STEP_4} onNext={onNext} onBack={onBack} onClose={onClose} />
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

