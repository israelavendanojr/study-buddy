import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Buddy from "../components/Buddy";

const placeholders = [
  "I want to learn chess…",
  "I want to speak Spanish…",
  "I want to run a 5K…",
  "I want to play guitar…",
  "I want to cook Italian food…",
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"goal" | "name">("goal");
  const [goal, setGoal] = useState("");
  const [buddyName, setBuddyName] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGoalSubmit = () => {
    if (goal.trim()) setStep("name");
  };

  const handleNameSubmit = () => {
    if (buddyName.trim()) {
      localStorage.setItem("studybuddy-goal", goal);
      localStorage.setItem("studybuddy-name", buddyName);
      navigate("/tuning");
    }
  };

  if (step === "name") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-slide-up">
        <h1 className="font-display text-3xl text-foreground mb-2 text-center">
          Your buddy needs a name!
        </h1>
        <p className="font-body text-muted-foreground mb-6 text-center">
          Give your new companion a special name
        </p>
        <div className="mb-6">
          <Buddy mood="excited" size={140} />
        </div>
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={buddyName}
            onChange={(e) => setBuddyName(e.target.value)}
            placeholder="Name your buddy…"
            className="w-full px-6 py-4 rounded-squircle-lg bg-card border-2 border-mint/30 text-foreground font-body text-lg text-center focus:outline-none focus:border-mint transition-colors card-shadow-mint"
          />
        </div>
        <button
          onClick={handleNameSubmit}
          disabled={!buddyName.trim()}
          className="mt-6 px-8 py-4 rounded-squircle-lg bg-peach font-display text-lg text-foreground press-scale card-shadow-peach disabled:opacity-40 transition-all"
        >
          Nice to meet you! 👋
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="animate-slide-up flex flex-col items-center w-full max-w-sm">
        <h1 className="font-display text-4xl text-foreground mb-2 text-center leading-tight">
          Hi there! 👋
        </h1>
        <p className="font-display text-2xl text-foreground/80 mb-8 text-center">
          Let's learn something amazing.
        </p>

        <div className="w-full bg-card rounded-squircle-lg p-6 card-shadow-mint mb-6">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={placeholders[placeholderIdx]}
            className="w-full bg-transparent text-foreground font-body text-lg placeholder:text-muted-foreground/60 focus:outline-none transition-all"
          />
        </div>

        <button
          onClick={handleGoalSubmit}
          disabled={!goal.trim()}
          className="w-full py-4 rounded-squircle-lg bg-mint font-display text-xl text-primary-foreground press-scale card-shadow-mint disabled:opacity-40 transition-all"
        >
          Let's Go! →
        </button>
      </div>

      <div className="mt-10 animate-bounce-in">
        <Buddy mood="wave" size={130} />
      </div>
    </div>
  );
};

export default Onboarding;
