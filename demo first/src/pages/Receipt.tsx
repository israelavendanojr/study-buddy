import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Buddy from "../components/Buddy";
import Confetti from "../components/Confetti";
import Sparkles from "../components/Sparkles";

type ReceiptStep = "prompt" | "upload" | "reviewing" | "result";

const Receipt: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<ReceiptStep>("prompt");

  const handleUpload = () => {
    setStep("reviewing");
    setTimeout(() => setStep("result"), 3000);
  };

  if (step === "reviewing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="relative">
          <Buddy mood="glasses" size={130} />
          <Sparkles count={8} />
        </div>
        <p className="mt-6 font-display text-xl text-foreground">Your buddy is reviewing…</p>
        <div className="w-48 h-3 rounded-full bg-muted mt-4 overflow-hidden">
          <div
            className="h-full bg-mint rounded-full transition-all"
            style={{ width: "100%", animation: "slide-up 2.5s ease-out" }}
          />
        </div>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-slide-up relative">
        <Confetti />
        <Buddy mood="celebrate" size={110} className="mb-4" />

        {/* Receipt card with torn edge */}
        <div className="w-full max-w-sm bg-card rounded-squircle-lg overflow-hidden card-shadow-golden">
          <div className="h-4 bg-golden/30" style={{
            maskImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 16 Q10 0 20 16 Q30 0 40 16 Q50 0 60 16 Q70 0 80 16 Q90 0 100 16 Q110 0 120 16 Q130 0 140 16 Q150 0 160 16 Q170 0 180 16 Q190 0 200 16 Q210 0 220 16 Q230 0 240 16 Q250 0 260 16 Q270 0 280 16 Q290 0 300 16 Q310 0 320 16 Q330 0 340 16 Q350 0 360 16 Q370 0 380 16 Q390 0 400 16 V0 H0 Z' fill='black'/%3E%3C/svg%3E\")",
            WebkitMaskImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 16 Q10 0 20 16 Q30 0 40 16 Q50 0 60 16 Q70 0 80 16 Q90 0 100 16 Q110 0 120 16 Q130 0 140 16 Q150 0 160 16 Q170 0 180 16 Q190 0 200 16 Q210 0 220 16 Q230 0 240 16 Q250 0 260 16 Q270 0 280 16 Q290 0 300 16 Q310 0 320 16 Q330 0 340 16 Q350 0 360 16 Q370 0 380 16 Q390 0 400 16 V0 H0 Z' fill='black'/%3E%3C/svg%3E\")",
          }} />
          <div className="p-6">
            <div className="text-4xl text-center mb-3">⭐</div>
            <p className="font-body text-foreground leading-relaxed text-center">
              Amazing effort! You used three new phrases and your confidence is showing. 
              Keep it up! Next time try including a greeting.
            </p>
            <div className="mt-4 text-center">
              <span className="inline-block bg-golden/30 px-4 py-2 rounded-full font-display text-lg">
                +250 XP 🎉
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 w-full max-w-sm">
          <button
            onClick={() => navigate("/badges")}
            className="flex-1 py-3 rounded-squircle bg-lavender font-display text-sm text-foreground press-scale"
          >
            Share to Badge Board
          </button>
          <button
            onClick={() => navigate("/roadmap")}
            className="flex-1 py-3 rounded-squircle bg-mint font-display text-sm text-primary-foreground press-scale"
          >
            Continue My Path
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24">
      <h1 className="font-display text-3xl text-foreground text-center mb-2">
        Time for your Receipt! 📸
      </h1>
      <div className="my-6">
        <Buddy mood="excited" size={120} />
      </div>
      <div className="w-full max-w-sm bg-card rounded-squircle-lg p-6 card-shadow-peach mb-6">
        <p className="font-body text-foreground/80 text-center leading-relaxed">
          Record a short video of yourself ordering food in Spanish — even just 30 seconds is perfect!
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={handleUpload}
          className="w-full py-4 rounded-squircle-lg bg-sky font-display text-lg text-accent-foreground press-scale card-shadow-sky"
        >
          📷 Upload a Photo
        </button>
        <button
          onClick={handleUpload}
          className="w-full py-4 rounded-squircle-lg bg-peach font-display text-lg text-secondary-foreground press-scale card-shadow-peach"
        >
          🎥 Record a Video
        </button>
      </div>
    </div>
  );
};

export default Receipt;
