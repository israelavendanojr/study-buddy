import React from "react";

const Sparkles: React.FC<{ count?: number; className?: string }> = ({ count = 6, className = "" }) => {
  const sparkles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 20 + Math.random() * 60,
    top: 20 + Math.random() * 60,
    delay: Math.random() * 2,
    size: 8 + Math.random() * 12,
  }));

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="absolute animate-sparkle text-golden"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDelay: `${s.delay}s`,
            fontSize: s.size,
          }}
        >
          ✨
        </span>
      ))}
    </div>
  );
};

export default Sparkles;
