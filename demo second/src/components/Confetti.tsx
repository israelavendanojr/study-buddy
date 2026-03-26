import React, { useEffect, useState } from 'react';

const COLORS = ['#A8E6C3', '#FFCBA4', '#B8D8F8', '#D4BBFF', '#FFE082', '#FFB5C5'];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

const Confetti: React.FC<{ active: boolean; onDone?: () => void }> = ({ active, onDone }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const ps: Particle[] = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
      }));
      setParticles(ps);
      const t = setTimeout(() => {
        setParticles([]);
        onDone?.();
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!particles.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: -10,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.size > 10 ? '50%' : '2px',
            animation: `confetti-fall ${1.5 + Math.random()}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
