import React from 'react';

type Mood = 'idle' | 'excited' | 'happy' | 'thinking' | 'sad' | 'celebration' | 'reviewing' | 'wiggle' | 'wave';

interface CompanionProps {
  size?: number;
  color?: string;
  mood?: Mood;
  glasses?: boolean;
  accessory?: string;
  className?: string;
}

const moodAnimations: Record<Mood, string> = {
  idle: 'animate-idle',
  excited: 'animate-excited',
  happy: 'animate-happy',
  thinking: 'animate-thinking',
  sad: 'animate-sad',
  celebration: 'animate-happy',
  reviewing: 'animate-reviewing',
  wiggle: 'animate-wiggle',
  wave: 'animate-wave',
};

const Companion: React.FC<CompanionProps> = ({
  size = 120,
  color = '#A8E6C3',
  mood = 'idle',
  glasses = true,
  className = '',
}) => {
  const r = size / 2;
  const eyeR = size * 0.12;
  const pupilR = size * 0.06;
  const reflectR = size * 0.025;
  const cheekR = size * 0.07;
  const armW = size * 0.12;
  const armH = size * 0.2;

  return (
    <div className={`inline-block ${moodAnimations[mood]} ${className}`} style={{ width: size, height: size + size * 0.15 }}>
      <svg viewBox={`0 0 ${size * 1.4} ${size * 1.3}`} width={size * 1.4} height={size * 1.3}>
        {/* Arms */}
        <ellipse cx={size * 0.18} cy={size * 0.65} rx={armW / 2} ry={armH / 2} fill={color} opacity={0.9} transform={`rotate(-20, ${size * 0.18}, ${size * 0.65})`} />
        <ellipse cx={size * 1.22} cy={size * 0.65} rx={armW / 2} ry={armH / 2} fill={color} opacity={0.9} transform={`rotate(20, ${size * 1.22}, ${size * 0.65})`} />

        {/* Body */}
        <ellipse cx={size * 0.7} cy={size * 0.6} rx={r} ry={r * 1.05} fill={color} />
        {/* Belly */}
        <ellipse cx={size * 0.7} cy={size * 0.7} rx={r * 0.6} ry={r * 0.65} fill="#FFFDF7" opacity={0.7} />

        {/* Eyes */}
        <circle cx={size * 0.52} cy={size * 0.45} r={eyeR} fill="#2D2D2D" />
        <circle cx={size * 0.88} cy={size * 0.45} r={eyeR} fill="#2D2D2D" />
        {/* Pupils */}
        <circle cx={size * 0.54} cy={size * 0.43} r={pupilR} fill="#1A1A1A" />
        <circle cx={size * 0.9} cy={size * 0.43} r={pupilR} fill="#1A1A1A" />
        {/* Reflections */}
        <circle cx={size * 0.56} cy={size * 0.41} r={reflectR} fill="white" />
        <circle cx={size * 0.92} cy={size * 0.41} r={reflectR} fill="white" />

        {/* Cheeks */}
        <circle cx={size * 0.4} cy={size * 0.56} r={cheekR} fill="#FFB5C5" opacity={0.5} />
        <circle cx={size * 1.0} cy={size * 0.56} r={cheekR} fill="#FFB5C5" opacity={0.5} />

        {/* Mouth */}
        {mood === 'sad' ? (
          <path d={`M ${size * 0.6} ${size * 0.68} Q ${size * 0.7} ${size * 0.63} ${size * 0.8} ${size * 0.68}`} fill="none" stroke="#2D2D2D" strokeWidth={2} strokeLinecap="round" />
        ) : mood === 'excited' || mood === 'celebration' ? (
          <ellipse cx={size * 0.7} cy={size * 0.66} rx={size * 0.08} ry={size * 0.06} fill="#2D2D2D" />
        ) : (
          <path d={`M ${size * 0.6} ${size * 0.65} Q ${size * 0.7} ${size * 0.73} ${size * 0.8} ${size * 0.65}`} fill="none" stroke="#2D2D2D" strokeWidth={2} strokeLinecap="round" />
        )}

        {/* Glasses */}
        {glasses && (
          <g opacity={mood === 'reviewing' ? 1 : 0.9}>
            <circle cx={size * 0.52} cy={size * 0.45} r={eyeR * 1.5} fill="none" stroke="#6B5B4E" strokeWidth={1.5} />
            <circle cx={size * 0.88} cy={size * 0.45} r={eyeR * 1.5} fill="none" stroke="#6B5B4E" strokeWidth={1.5} />
            <line x1={size * 0.52 + eyeR * 1.5} y1={size * 0.45} x2={size * 0.88 - eyeR * 1.5} y2={size * 0.45} stroke="#6B5B4E" strokeWidth={1.5} />
            <line x1={size * 0.52 - eyeR * 1.5} y1={size * 0.45} x2={size * 0.35} y2={size * 0.42} stroke="#6B5B4E" strokeWidth={1.5} />
            <line x1={size * 0.88 + eyeR * 1.5} y1={size * 0.45} x2={size * 1.05} y2={size * 0.42} stroke="#6B5B4E" strokeWidth={1.5} />
          </g>
        )}
      </svg>
    </div>
  );
};

export default Companion;
