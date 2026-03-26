import React from "react";

const Confetti: React.FC = () => {
  const colors = ["#A8E6C3", "#FFCBA4", "#B8D8F8", "#D4BBFF", "#FFE082"];
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 1,
    size: 6 + Math.random() * 8,
    duration: 1.5 + Math.random() * 1.5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
