import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { friends } from '../data/mockData';
import Companion from '../components/Companion';

const BadgeBoard: React.FC = () => {
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});

  const friend = friends.find(f => f.id === selectedFriend);

  const toggleReaction = (friendId: string, reaction: string) => {
    setReactions(prev => {
      const current = prev[friendId] || [];
      if (current.includes(reaction)) {
        return { ...prev, [friendId]: current.filter(r => r !== reaction) };
      }
      return { ...prev, [friendId]: [...current, reaction] };
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <h1 className="text-2xl font-heading text-foreground text-center pt-6 pb-4">Badge Board 🏅</h1>

      {/* Active buddy bubbles */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {friends.map(f => (
          <button key={f.id} onClick={() => setSelectedFriend(f.id)} className="flex flex-col items-center gap-1 min-w-[60px] press">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ring-3 ${
              f.activeToday ? 'ring-primary' : 'ring-border'
            }`} style={{ backgroundColor: f.buddyColor }}>
              <Companion size={35} color={f.buddyColor} mood="idle" glasses={false} />
            </div>
            <span className="text-xs font-body text-muted-foreground truncate w-14 text-center">{f.buddyName}</span>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="px-4 space-y-4">
        {friends.filter(f => f.lastReceipt).map(f => (
          <div key={f.id} className="bg-card squircle p-4 shadow-mint">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: f.buddyColor }}>
                <Companion size={28} color={f.buddyColor} mood="idle" glasses={false} />
              </div>
              <div className="flex-1">
                <p className="font-heading text-sm text-foreground">{f.name} / {f.buddyName}</p>
                <p className="text-xs text-muted-foreground font-body">Lv. {f.level} · 🔥 {f.streak} day streak</p>
              </div>
            </div>

            <span className="inline-block bg-muted px-3 py-1 rounded-full text-xs font-body text-muted-foreground mb-3">
              {f.lastReceipt!.tag}
            </span>

            {/* Media placeholder */}
            <div className="w-full h-36 bg-muted rounded-2xl mb-3 flex items-center justify-center">
              <span className="text-3xl">{f.lastReceipt!.result === 'excellent' ? '⭐' : '✅'}</span>
            </div>

            <p className="font-body text-sm text-muted-foreground italic mb-3">"{f.lastReceipt!.feedback}"</p>

            {/* Companion mood */}
            <div className="flex items-center gap-2 mb-3">
              <Companion size={24} color={f.buddyColor} mood="happy" glasses={false} />
              <span className="text-xs font-body text-muted-foreground">{f.buddyName} is glowing today! ✨</span>
            </div>

            {/* Reactions */}
            <div className="flex gap-2">
              {['🔥 Hype', '💪 Inspire', '🌟 Shine'].map(r => {
                const active = (reactions[f.id] || []).includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleReaction(f.id, r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body press transition-all ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Friend flyout */}
      <AnimatePresence>
        {friend && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-w-[430px] mx-auto"
          >
            <div className="absolute inset-0 -top-[100vh] bg-foreground/20" onClick={() => setSelectedFriend(null)} />
            <div className="relative bg-card rounded-t-[32px] p-6 pb-8">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: friend.buddyColor }}>
                  <Companion size={45} color={friend.buddyColor} mood="idle" glasses={false} />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-foreground">{friend.name}</h3>
                  <p className="text-sm text-muted-foreground font-body">{friend.buddyName} · Lv. {friend.level}</p>
                </div>
              </div>
              <div className="bg-muted squircle-sm p-3 mb-3">
                <p className="font-body text-sm text-foreground">{friend.goal}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">{friend.chapterProgress}</p>
                <div className="w-full h-2 rounded-full bg-border overflow-hidden mt-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: '45%' }} />
                </div>
              </div>
              {friend.lastReceipt && (
                <p className="text-sm text-muted-foreground font-body italic">Last receipt: "{friend.lastReceipt.feedback}"</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BadgeBoard;
