export interface OnboardingScreenProps {
  onContinue?: () => void;
  onBack?: () => void;
  progress: number; // 0–1, auto-computed by App.tsx from position in ONBOARDING_FLOW
}

/** Height of the onboarding progress bar rendered above the scroll content. */
export const ONBOARDING_PROGRESS_BAR_HEIGHT = 52;
