import React from 'react';
import Companion from './Companion';

interface CompanionSceneProps {
  buddyName: string;
  mood?: 'idle' | 'excited' | 'happy' | 'thinking' | 'sad' | 'celebration' | 'reviewing' | 'wiggle' | 'wave';
  speechBubble?: string;
}

const CompanionScene: React.FC<CompanionSceneProps> = ({ buddyName, mood = 'idle', speechBubble }) => {
  return (
    <div className="relative w-full h-64 rounded-squircle-lg overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(35, 60%, 85%) 0%, hsl(30, 50%, 80%) 100%)' }}>
      {/* Sky */}
      <div className="absolute top-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(180deg, hsl(200, 60%, 88%) 0%, hsl(35, 60%, 85%) 100%)' }} />
      
      {/* Clouds */}
      <div className="absolute top-4 left-6 w-16 h-6 rounded-full bg-background opacity-60" />
      <div className="absolute top-8 right-10 w-20 h-7 rounded-full bg-background opacity-50" />
      <div className="absolute top-2 right-24 w-12 h-5 rounded-full bg-background opacity-40" />

      {/* Ground/Courtyard */}
      <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'hsl(25, 40%, 75%)' }}>
        {/* Tiles pattern */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-conic-gradient(hsl(25, 30%, 65%) 0% 25%, transparent 0% 50%)', backgroundSize: '20px 20px' }} />
      </div>

      {/* Fountain */}
      <div className="absolute bottom-16 right-8">
        <div className="w-12 h-16 rounded-t-full" style={{ background: 'hsl(30, 30%, 70%)' }} />
        <div className="w-16 h-3 rounded-full -ml-2" style={{ background: 'hsl(30, 30%, 65%)' }} />
      </div>

      {/* Plant pots */}
      <div className="absolute bottom-16 left-6">
        <div className="w-6 h-8 rounded-t-full" style={{ background: 'hsl(120, 40%, 55%)' }} />
        <div className="w-8 h-4 rounded-b-lg -ml-1" style={{ background: 'hsl(15, 50%, 55%)' }} />
      </div>
      <div className="absolute bottom-16 left-20">
        <div className="w-5 h-6 rounded-t-full" style={{ background: 'hsl(130, 35%, 60%)' }} />
        <div className="w-7 h-3 rounded-b-lg -ml-1" style={{ background: 'hsl(15, 50%, 55%)' }} />
      </div>

      {/* Speech bubble */}
      {speechBubble && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-background px-4 py-2 rounded-2xl shadow-mint max-w-[80%] text-center">
          <p className="text-sm font-semibold text-foreground">{speechBubble}</p>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-background rotate-45 rounded-sm" />
        </div>
      )}

      {/* Companion */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <Companion size={100} mood={mood} glasses={true} />
      </div>
    </div>
  );
};

export default CompanionScene;
