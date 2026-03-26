import React from "react";

type BuddyMood = "idle" | "wave" | "excited" | "thinking" | "curious" | "happy" | "celebrate" | "glasses";

interface BuddyProps {
  mood?: BuddyMood;
  size?: number;
  name?: string;
  className?: string;
}

const moodAnimations: Record<BuddyMood, string> = {
  idle: "animate-breathe",
  wave: "animate-wave",
  excited: "animate-wiggle",
  thinking: "",
  curious: "",
  happy: "animate-bounce-in",
  celebrate: "animate-celebrate",
  glasses: "",
};

const Buddy: React.FC<BuddyProps> = ({ mood = "idle", size = 120, className = "" }) => {
  const animClass = moodAnimations[mood];

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className={animClass}
        style={{ transformOrigin: "center center" }}
      >
        {/* Body */}
        <ellipse cx="100" cy="115" rx="70" ry="65" fill="hsl(150, 52%, 78%)" />
        {/* Belly */}
        <ellipse cx="100" cy="125" rx="45" ry="40" fill="#FFFDF7" opacity="0.7" />
        {/* Left arm */}
        <ellipse
          cx="38"
          cy="120"
          rx="14"
          ry="10"
          fill="hsl(150, 52%, 72%)"
          transform={mood === "wave" ? "rotate(-20, 38, 120)" : ""}
        />
        {/* Right arm */}
        <ellipse
          cx="162"
          cy="120"
          rx="14"
          ry="10"
          fill="hsl(150, 52%, 72%)"
          className={mood === "wave" ? "animate-wave" : ""}
          style={{ transformOrigin: "162px 120px" }}
        />
        {/* Left eye */}
        <ellipse cx="78" cy="95" rx="12" ry="14" fill="white" />
        <ellipse cx="80" cy="96" rx="7" ry="8" fill="#3a3a3a" />
        <ellipse cx="82" cy="93" rx="3" ry="3" fill="white" />
        {/* Right eye */}
        <ellipse cx="122" cy="95" rx="12" ry="14" fill="white" />
        <ellipse cx="124" cy="96" rx="7" ry="8" fill="#3a3a3a" />
        <ellipse cx="126" cy="93" rx="3" ry="3" fill="white" />
        {/* Mouth */}
        {mood === "happy" || mood === "celebrate" || mood === "excited" ? (
          <path d="M 88 118 Q 100 132 112 118" stroke="#3a3a3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : mood === "thinking" || mood === "curious" ? (
          <ellipse cx="100" cy="120" rx="5" ry="4" fill="#3a3a3a" />
        ) : (
          <path d="M 90 118 Q 100 126 110 118" stroke="#3a3a3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {/* Blush */}
        <ellipse cx="68" cy="112" rx="10" ry="6" fill="hsl(25, 100%, 82%)" opacity="0.4" />
        <ellipse cx="132" cy="112" rx="10" ry="6" fill="hsl(25, 100%, 82%)" opacity="0.4" />
        {/* Glasses for reviewing mood */}
        {mood === "glasses" && (
          <>
            <circle cx="78" cy="95" r="16" stroke="#7a6a5a" strokeWidth="2.5" fill="none" />
            <circle cx="122" cy="95" r="16" stroke="#7a6a5a" strokeWidth="2.5" fill="none" />
            <line x1="94" y1="95" x2="106" y2="95" stroke="#7a6a5a" strokeWidth="2.5" />
          </>
        )}
      </svg>
    </div>
  );
};

export default Buddy;
