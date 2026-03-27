import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Companion from '../components/Companion';
import { companionColors, accessories, rooms } from '../data/mockData';

interface BuddyCustomizationProps {
  onBack: () => void;
}

const BuddyCustomization: React.FC<BuddyCustomizationProps> = ({ onBack }) => {
  const [tab, setTab] = useState<'colors' | 'accessories' | 'rooms'>('colors');
  const [selectedColor, setSelectedColor] = useState('#A8E6C3');
  const [companionMood, setCompanionMood] = useState<'idle' | 'happy'>('idle');

  const handleEquip = (color?: string) => {
    if (color) setSelectedColor(color);
    setCompanionMood('happy');
    setTimeout(() => setCompanionMood('idle'), 800);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center px-4 pt-4 pb-2">
        <button onClick={onBack} className="p-2 rounded-2xl bg-card press"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-heading text-foreground ml-3">Customize</h1>
      </div>

      <div className="flex justify-center py-6">
        <Companion size={140} color={selectedColor} mood={companionMood} glasses={true} />
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 px-4 mb-6">
        {(['colors', 'accessories', 'rooms'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-2xl font-heading text-sm press transition-all ${
              tab === t ? 'bg-primary text-primary-foreground shadow-mint' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4">
        {tab === 'colors' && (
          <div className="grid grid-cols-4 gap-4">
            {companionColors.map(c => (
              <button
                key={c.name}
                onClick={() => c.unlocked && handleEquip(c.color)}
                className={`flex flex-col items-center gap-2 press ${!c.unlocked ? 'opacity-60' : ''}`}
              >
                <div
                  className={`w-14 h-14 rounded-full transition-all ${selectedColor === c.color ? 'ring-4 ring-primary ring-offset-2' : ''}`}
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-xs font-body text-muted-foreground">{c.name}</span>
                {!c.unlocked && (
                  <span className="text-[10px] font-body text-muted-foreground">
                    {c.pro ? 'Pro' : `${c.cost}`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {tab === 'accessories' && (
          <div className="grid grid-cols-3 gap-3">
            {accessories.map(a => (
              <div key={a.name} className={`bg-card squircle-sm p-3 text-center press ${!a.unlocked ? 'opacity-50' : ''}`}>
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-muted flex items-center justify-center">
                  {a.unlocked ? (
                    <span className="text-2xl">🎩</span>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-border" />
                  )}
                </div>
                <p className="text-xs font-body text-foreground">{a.name}</p>
                {a.equipped && <span className="text-[10px] text-primary font-body">Equipped</span>}
                {!a.unlocked && (
                  <span className="text-[10px] text-muted-foreground font-body block">
                    {(a as any).pro ? '👑 Pro' : `${a.cost}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'rooms' && (
          <div className="space-y-3">
            {rooms.map(r => (
              <div key={r.name} className={`bg-card squircle p-4 flex items-center gap-4 press ${!r.unlocked ? 'opacity-50' : ''}`}>
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex">
                  {r.colors.map((c, i) => (
                    <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex-1">
                  <p className="font-heading text-sm text-foreground">{r.name}</p>
                  {r.equipped && <span className="text-xs text-primary font-body">Current room</span>}
                  {!r.unlocked && (
                    <span className="text-xs text-muted-foreground font-body">
                      {r.pro ? '👑 Pro' : `🔒 ${r.cost}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pro banner */}
      <div className="mx-4 mt-6 bg-secondary/30 squircle p-4 text-center press">
        <p className="font-heading text-sm text-foreground">Unlock everything with StudBud Pro →</p>
      </div>
    </div>
  );
};

export default BuddyCustomization;
