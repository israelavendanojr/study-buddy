import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Companion from '../components/Companion';

const placeholders = [
  "I want to speak Spanish…",
  "I want to learn chess…",
  "I want to run a 5K…",
  "I want to cook Italian food…",
];

interface OnboardingProps {
  onComplete: (goal: string, buddyName: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'goal' | 'name'>('goal');
  const [goal, setGoal] = useState('');
  const [buddyName, setBuddyName] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [companionMood, setCompanionMood] = useState<'wave' | 'idle' | 'wiggle' | 'excited'>('wave');

  useEffect(() => {
    const t = setTimeout(() => setCompanionMood('idle'), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGoalSubmit = () => {
    if (!goal.trim()) return;
    setCompanionMood('wiggle');
    setStep('name');
    setTimeout(() => setCompanionMood('excited'), 600);
  };

  const handleNameSubmit = () => {
    if (!buddyName.trim()) return;
    setCompanionMood('excited');
    setTimeout(() => onComplete(goal, buddyName), 800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-12">
      <AnimatePresence mode="wait">
        {step === 'goal' ? (
          <motion.div
            key="goal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <h1 className="text-3xl font-heading text-foreground mb-2">Hi there! 👋</h1>
            <p className="text-lg text-muted-foreground font-body mb-8">Let's learn something amazing.</p>

            <div className="w-full bg-card squircle p-6 shadow-mint mb-6">
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder={placeholders[placeholderIdx]}
                className="w-full bg-transparent border-2 border-border rounded-2xl px-5 py-4 text-lg font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleGoalSubmit()}
              />
            </div>

            <button
              onClick={handleGoalSubmit}
              className="w-full bg-primary text-primary-foreground font-heading text-xl py-4 rounded-2xl shadow-mint press transition-all hover:brightness-105"
            >
              Let's Go! →
            </button>

            <div className="mt-8">
              <Companion size={100} mood={companionMood} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <h1 className="text-3xl font-heading text-foreground mb-2">Your buddy needs a name!</h1>
            <p className="text-lg text-muted-foreground font-body mb-8">Give your new companion a special name.</p>

            <div className="mb-6">
              <Companion size={120} mood={companionMood} />
            </div>

            <div className="w-full bg-card squircle p-6 shadow-peach mb-6">
              <input
                type="text"
                value={buddyName}
                onChange={e => setBuddyName(e.target.value)}
                placeholder="Name your buddy…"
                className="w-full bg-transparent border-2 border-border rounded-2xl px-5 py-4 text-lg font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-secondary transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              />
            </div>

            <button
              onClick={handleNameSubmit}
              className="w-full bg-secondary text-secondary-foreground font-heading text-xl py-4 rounded-2xl shadow-peach press transition-all hover:brightness-105"
            >
              Nice to meet you! 🤝
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
