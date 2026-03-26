import React from 'react';
import { Palette, Settings } from 'lucide-react';
import CompanionScene from '../components/CompanionScene';

interface HomeScreenProps {
  buddyName: string;
  onOpenCustomization: () => void;
  onOpenSettings: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ buddyName, onOpenCustomization, onOpenSettings }) => {
  const streak = 7;
  const xp = 530;
  const level = 4;
  const xpToNext = 200;
  const xpInLevel = 130;

  const getSpeechBubble = () => {
    if (streak === 7) return "7 days! Look at us go!! 🎉";
    return "Ready to learn! Let's go! 🌟";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <div className="flex justify-end gap-2 px-4 pt-4 pb-2">
        <button onClick={onOpenCustomization} className="p-2 rounded-2xl bg-card press shadow-lavender">
          <Palette size={22} className="text-foreground" />
        </button>
        <button onClick={onOpenSettings} className="p-2 rounded-2xl bg-card press shadow-mint">
          <Settings size={22} className="text-foreground" />
        </button>
      </div>

      {/* Companion World */}
      <div className="px-4 mb-4">
        <CompanionScene buddyName={buddyName} mood="idle" speechBubble={getSpeechBubble()} />
      </div>

      {/* Buddy info */}
      <div className="px-4 space-y-3">
        <div className="bg-card squircle p-4 shadow-mint">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-heading text-lg text-foreground">{buddyName}</span>
              <span className="text-muted-foreground font-body ml-2">· Lv. {level}</span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(xpInLevel / xpToNext) * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-body">{xpInLevel}/{xpToNext} XP to Lv. {level + 1}</p>
        </div>

        {/* Goal card */}
        <div className="bg-card squircle p-4 shadow-peach">
          <p className="font-heading text-base text-foreground mb-1">Spanish · Week 3 of 8</p>
          <p className="text-sm text-muted-foreground font-body mb-2">Chapter 2 of 4</p>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-2">
            <div className="h-full rounded-full bg-secondary" style={{ width: '35%' }} />
          </div>
          <div className="flex gap-4">
            <button className="text-xs text-muted-foreground font-body underline">Retune Goal</button>
            <button className="text-xs text-muted-foreground font-body underline">New Goal</button>
          </div>
        </div>

        {/* Today's nudge */}
        <div className="bg-primary/10 squircle p-4 shadow-mint press cursor-pointer">
          <p className="text-sm text-muted-foreground font-body mb-1">Continue today</p>
          <p className="font-heading text-base text-foreground">Ordering Food Like a Local →</p>
        </div>

        {/* Streak + XP */}
        <div className="flex justify-center gap-6 py-2">
          <span className="font-body text-sm text-foreground">🔥 Day {streak} streak</span>
          <span className="font-body text-sm text-foreground">⭐ {xp} XP</span>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
