import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Companion from '../components/Companion';

interface GoalTuningProps {
  goal: string;
  buddyName: string;
  onComplete: () => void;
}

const GoalTuning: React.FC<GoalTuningProps> = ({ goal, buddyName, onComplete }) => {
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState('');
  const [hours, setHours] = useState(5);
  const [duration, setDuration] = useState('');
  const [successVision, setSuccessVision] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const moods: Array<'thinking' | 'idle' | 'excited' | 'happy'> = ['thinking', 'idle', 'excited', 'happy'];
  const totalSteps = 4;

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      setShowLoading(true);
      setTimeout(() => {
        setShowLoading(false);
        setShowResult(true);
      }, 2500);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!experience;
    if (step === 2) return !!duration;
    if (step === 3) return !!successVision.trim();
    return true;
  };

  const sessionsPer = Math.round(hours / 0.33);
  const sessionsPerWeek = Math.min(sessionsPer, 7);
  const minutesPerSession = Math.round((hours * 60) / sessionsPerWeek);
  const durationWeeks = duration === '2 Weeks' ? 2 : duration === '1 Month' ? 4 : duration === '3 Months' ? 12 : 24;

  if (showLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-xl font-heading text-foreground mb-6">Tuning your goal…</p>
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-primary border-t-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Companion size={60} mood="happy" />
          </div>
        </div>
        {/* Sparkles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute animate-sparkle text-golden text-xl" style={{
            top: `${30 + Math.random() * 40}%`,
            left: `${20 + Math.random() * 60}%`,
            animationDelay: `${i * 0.3}s`,
          }}>✦</div>
        ))}
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-12">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <div className="bg-secondary/30 squircle p-6 shadow-peach mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⭐</span>
              <h2 className="text-xl font-heading text-foreground">Your Tuned Goal</h2>
            </div>
            <p className="text-foreground font-body text-base leading-relaxed mb-4">
              In {durationWeeks} weeks, you'll go from {experience === 'beginner' ? 'total beginner' : experience === 'some' ? 'having some experience' : 'being pretty confident'} to {successVision || `mastering ${goal}`}, practicing {sessionsPerWeek}x per week for {minutesPerSession} minutes.
            </p>
            <span className="inline-block bg-primary/20 text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
              {hours <= 5 ? '✅ Very Achievable' : '⚡ Ambitious but doable'}
            </span>
          </div>

          <Companion size={80} mood="excited" className="mx-auto block mb-6" />

          <button onClick={onComplete} className="w-full bg-primary text-primary-foreground font-heading text-xl py-4 rounded-2xl shadow-mint press mb-3">
            This is my goal! →
          </button>
          <button onClick={() => { setShowResult(false); setStep(0); }} className="w-full text-muted-foreground font-body text-base py-2">
            Retune
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-12 pb-12">
      <h1 className="text-2xl font-heading text-foreground text-center mb-1">Goal Tuning ✨</h1>
      <p className="text-muted-foreground font-body text-center mb-6">Let's make your goal something you can actually crush.</p>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {[...Array(totalSteps)].map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          <div className="bg-card squircle p-6 shadow-mint relative">
            <div className="absolute top-3 right-3">
              <Companion size={50} mood={moods[step]} glasses={step === 1} />
            </div>

            {step === 0 && (
              <>
                <h2 className="text-lg font-heading text-foreground mb-4 pr-16">What's your experience level?</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { val: 'beginner', label: '🌱 Total Beginner' },
                    { val: 'some', label: '🌿 Some Experience' },
                    { val: 'confident', label: '🌳 Pretty Confident' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setExperience(opt.val)}
                      className={`w-full py-4 px-5 rounded-2xl text-left font-body text-base press transition-all ${
                        experience === opt.val
                          ? 'bg-primary text-primary-foreground shadow-mint'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-lg font-heading text-foreground mb-4 pr-16">How many hours a week can you commit?</h2>
                <div className="mt-6 mb-4">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={hours}
                    onChange={e => setHours(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((hours - 1) / 19) * 100}%, hsl(var(--border)) ${((hours - 1) / 19) * 100}%, hsl(var(--border)) 100%)`,
                    }}
                  />
                  <p className="text-center text-2xl font-heading text-foreground mt-3">{hours} hrs/week</p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-heading text-foreground mb-4 pr-16">How long do you want to work toward this?</h2>
                <div className="flex flex-wrap gap-3">
                  {['2 Weeks', '1 Month', '3 Months', '6 Months'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-3 px-5 rounded-2xl font-body text-base press transition-all ${
                        duration === d
                          ? 'bg-primary text-primary-foreground shadow-mint'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-lg font-heading text-foreground mb-4 pr-16">What does success feel like to you?</h2>
                <input
                  type="text"
                  value={successVision}
                  onChange={e => setSuccessVision(e.target.value)}
                  placeholder="e.g. Hold a real conversation in Spanish…"
                  className="w-full bg-transparent border-2 border-border rounded-2xl px-5 py-4 text-base font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={nextStep}
        disabled={!canProceed()}
        className="mt-6 w-full bg-primary text-primary-foreground font-heading text-lg py-4 rounded-2xl shadow-mint press transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {step < totalSteps - 1 ? 'Next →' : 'Tune My Goal →'}
      </button>
    </div>
  );
};

export default GoalTuning;
