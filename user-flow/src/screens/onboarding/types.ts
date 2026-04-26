export interface OnboardingScreenProps {
  onContinue?: () => void;
  onBack?: () => void;
  progress: number; // 0–1, auto-computed by App.tsx from position in ONBOARDING_FLOW
}
