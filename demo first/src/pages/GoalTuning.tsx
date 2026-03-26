import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Buddy from "../components/Buddy";
import Sparkles from "../components/Sparkles";

const steps = [
  {
    question: "What's your experience level?",
    type: "pills" as const,
    options: [
      { label: "🌱 Total Beginner", value: "beginner" },
      { label: "🌿 Some Experience", value: "intermediate" },
      { label: "🌳 Pretty Confident", value: "advanced" },
    ],
  },
  {
    question: "How many hours a week can you commit?",
    type: "slider" as const,
  },
  {
    question: "How long do you want to work toward this?",
    type: "pills" as const,
    options: [
      { label: "2 Weeks", value: "2w" },
      { label: "1 Month", value: "1m" },
      { label: "3 Months", value: "3m" },
      { label: "6 Months", value: "6m" },
    ],
  },
  {
    question: "What does success feel like to you?",
    type: "text" as const,
  },
];

const buddyMoods: Array<"curious" | "thinking" | "excited" | "happy"> = [
  "curious",
  "thinking",
  "excited",
  "happy",
];

const GoalTuning: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hours, setHours] = useState(5);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const step = steps[currentStep];

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentStep]: value });
    if (currentStep < steps.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setShowResult(true);
      }, 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="relative">
          <Buddy mood="excited" size={120} className="animate-spin-slow" />
          <Sparkles count={8} />
        </div>
        <p className="mt-6 font-display text-xl text-foreground animate-pulse">
          Tuning your goal…
        </p>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-slide-up">
        <Buddy mood="celebrate" size={100} className="mb-4" />
        <div className="w-full max-w-sm bg-peach/30 rounded-squircle-lg p-6 card-shadow-peach relative">
          <div className="text-2xl mb-2">⭐</div>
          <h2 className="font-display text-xl text-foreground mb-3">Your Tuned Goal</h2>
          <p className="font-body text-foreground/80 leading-relaxed">
            In 8 weeks, you'll go from total beginner to holding a 2-minute Spanish conversation, 
            practicing 3x per week for 20 minutes.
          </p>
          <div className="mt-4 inline-block px-3 py-1 rounded-full bg-mint/40 font-body text-sm font-semibold text-primary-foreground">
            ✅ Very Achievable
          </div>
        </div>
        <button
          onClick={() => navigate("/roadmap")}
          className="mt-6 w-full max-w-sm py-4 rounded-squircle-lg bg-mint font-display text-lg text-primary-foreground press-scale card-shadow-mint"
        >
          This is my goal! Let's build my path →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12 pb-24">
      <h1 className="font-display text-3xl text-foreground text-center mb-1">
        Goal Tuning ✨
      </h1>
      <p className="font-body text-muted-foreground text-center mb-8">
        Let's make your goal something you can actually crush.
      </p>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i === currentStep ? "bg-mint scale-125" : i < currentStep ? "bg-mint/50" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center animate-slide-up" key={currentStep}>
        <div className="absolute top-20 right-6">
          <Buddy mood={buddyMoods[currentStep]} size={60} />
        </div>

        <div className="w-full max-w-sm bg-card rounded-squircle-lg p-6 card-shadow-sky">
          <h2 className="font-display text-lg text-foreground mb-5">{step.question}</h2>

          {step.type === "pills" && step.options && (
            <div className="flex flex-col gap-3">
              {step.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className={`w-full py-3 px-5 rounded-squircle bg-muted font-body font-semibold text-foreground press-scale hover:bg-mint/30 transition-colors text-left ${
                    answers[currentStep] === opt.value ? "bg-mint/40 ring-2 ring-mint" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {step.type === "slider" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full relative">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(150,52%,78%) ${(hours / 20) * 100}%, hsl(40,30%,93%) ${(hours / 20) * 100}%)`,
                  }}
                />
              </div>
              <span className="font-display text-2xl text-foreground">{hours} hrs/week</span>
              <button
                onClick={() => handleAnswer(String(hours))}
                className="mt-2 px-8 py-3 rounded-squircle bg-mint font-display text-primary-foreground press-scale"
              >
                Confirm
              </button>
            </div>
          )}

          {step.type === "text" && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={answers[currentStep] || ""}
                onChange={(e) => setAnswers({ ...answers, [currentStep]: e.target.value })}
                placeholder="e.g. Hold a real conversation in Spanish..."
                className="w-full px-4 py-3 rounded-squircle bg-muted font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-mint"
              />
              <button
                onClick={() => handleAnswer(answers[currentStep] || "")}
                disabled={!answers[currentStep]?.trim()}
                className="px-8 py-3 rounded-squircle bg-mint font-display text-primary-foreground press-scale disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalTuning;
