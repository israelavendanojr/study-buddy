import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { roadmap } from '../data/mockData';
import Companion from '../components/Companion';
import Confetti from '../components/Confetti';
import type { RoadmapNode } from '../data/mockData';

const MyPath: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [receiptFlow, setReceiptFlow] = useState<'challenge' | 'reviewing' | 'result' | null>(null);
  const [confetti, setConfetti] = useState(false);

  const nodeColors: Record<string, string> = {
    completed: 'bg-primary shadow-mint',
    current: 'bg-accent shadow-sky',
    upcoming: 'bg-muted',
    locked: 'bg-golden/30',
  };

  const handleNodeTap = (node: RoadmapNode) => {
    if (node.status === 'upcoming') return;
    if (node.type === 'receipt' && node.status === 'locked') return;
    setSelectedNode(node);
    if (node.type === 'receipt' && node.status !== 'completed') {
      setReceiptFlow('challenge');
    }
  };

  const handleMarkComplete = () => {
    setConfetti(true);
    setTimeout(() => {
      setSelectedNode(null);
    }, 1500);
  };

  const handleStartReceipt = () => {
    setReceiptFlow('reviewing');
    setTimeout(() => setReceiptFlow('result'), 3000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Confetti active={confetti} onDone={() => setConfetti(false)} />
      
      <h1 className="text-2xl font-heading text-foreground text-center pt-6 pb-4">My Path </h1>

      {/* Landscape background */}
      <div className="relative px-4">
        {/* Rolling hills bg */}
        <div className="absolute inset-x-0 top-0 h-32 opacity-20 -z-10" style={{ background: 'linear-gradient(180deg, hsl(120,30%,85%) 0%, transparent 100%)' }} />

        {roadmap.map((chapter, ci) => (
          <div key={chapter.id} className="mb-8">
            <div className="inline-block bg-card px-4 py-1.5 rounded-full shadow-mint mb-4">
              <span className="font-heading text-sm text-foreground">{chapter.title}</span>
            </div>

            <div className="relative">
              {/* Winding path line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border -translate-x-1/2 rounded-full" />

              {chapter.nodes.map((node, ni) => {
                const isLeft = ni % 2 === 0;
                const isReceipt = node.type === 'receipt';

                return (
                  <div
                    key={node.id}
                    className={`relative flex items-center mb-6 ${isLeft ? 'justify-start' : 'justify-end'}`}
                  >
                    <button
                      onClick={() => handleNodeTap(node)}
                      disabled={node.status === 'upcoming' || (node.type === 'receipt' && node.status === 'locked')}
                      className={`relative flex items-center gap-3 press transition-all ${isLeft ? 'flex-row' : 'flex-row-reverse'} ${
                        node.status === 'upcoming' || (node.type === 'receipt' && node.status === 'locked') ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Node circle */}
                      <div className={`${isReceipt ? 'w-14 h-14' : 'w-12 h-12'} rounded-2xl flex items-center justify-center ${nodeColors[node.status]} ${
                        node.status === 'current' ? 'animate-pulse ring-4 ring-accent/30' : ''
                      }`}>
                        {node.status === 'completed' && <span className="text-primary-foreground font-heading">✓</span>}
                        {isReceipt && <span className="text-lg">🏆</span>}
                        {node.status === 'current' && !isReceipt && <span className="text-accent-foreground font-heading text-xs">GO</span>}
                      </div>

                      {/* Label */}
                      <span className={`font-body text-sm max-w-[140px] text-left ${
                        node.status === 'current' ? 'text-foreground font-semibold' : 'text-muted-foreground'
                      }`}>
                        {node.title}
                      </span>

                      {/* Companion on current node */}
                      {node.status === 'current' && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                          <Companion size={45} mood="idle" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {selectedNode && !receiptFlow && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-w-[430px] mx-auto"
          >
            <div className="absolute inset-0 -top-[100vh] bg-foreground/20" onClick={() => setSelectedNode(null)} />
            <div className="relative bg-card rounded-t-[32px] p-6 pb-8">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
              <h3 className="font-heading text-lg text-foreground mb-1">{selectedNode.title}</h3>
              <p className="text-sm text-muted-foreground font-body mb-4">{selectedNode.description}</p>

              {/* Resources */}
              {selectedNode.resources && selectedNode.resources.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-3 mb-4 -mx-2 px-2">
                  {selectedNode.resources.map((res, i) => (
                    <div key={i} className="min-w-[180px] bg-muted squircle-sm p-3 relative">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-body mb-2 ${
                        res.type === 'video' ? 'bg-destructive/20 text-destructive' : 'bg-accent/50 text-accent-foreground'
                      }`}>
                        {res.type === 'video' ? '▶ Video' : '📄 Article'}
                      </span>
                      {res.buddyPick && (
                        <span className="absolute top-2 right-2 text-xs bg-golden/30 px-2 py-0.5 rounded-full font-body">⭐ Buddy's Pick</span>
                      )}
                      <p className="font-body text-sm text-foreground">{res.title}</p>
                      <p className="text-xs text-muted-foreground font-body">{res.time}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="bg-golden/20 text-foreground px-3 py-1 rounded-full text-sm font-body">+{selectedNode.xp} XP</span>
                {selectedNode.status !== 'completed' && (
                  <button onClick={handleMarkComplete} className="bg-primary text-primary-foreground font-heading py-3 px-6 rounded-2xl press shadow-mint">
                    Mark Complete ✓
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {receiptFlow && selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto"
          >
            {receiptFlow === 'challenge' && (
              <div className="w-full max-w-sm text-center">
                <h2 className="text-2xl font-heading text-foreground mb-4">Chapter Receipt! 📸</h2>
                <Companion size={100} mood="excited" className="mx-auto mb-6" />
                <div className="bg-card squircle p-5 shadow-golden mb-6">
                  <p className="font-body text-foreground">{selectedNode.receiptChallenge}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={handleStartReceipt} className="bg-accent text-accent-foreground font-heading py-4 rounded-2xl press shadow-sky">📷 Upload a Photo</button>
                  <button onClick={handleStartReceipt} className="bg-secondary text-secondary-foreground font-heading py-4 rounded-2xl press shadow-peach">🎥 Record a Video</button>
                </div>
                <button onClick={() => { setReceiptFlow(null); setSelectedNode(null); }} className="mt-4 text-muted-foreground font-body text-sm">Cancel</button>
              </div>
            )}

            {receiptFlow === 'reviewing' && (
              <div className="text-center">
                <p className="font-heading text-xl text-foreground mb-4">{buddyNameFromStorage()} is reviewing…</p>
                <Companion size={100} mood="reviewing" glasses={true} className="mx-auto mb-4" />
                <div className="w-48 h-2 rounded-full bg-muted overflow-hidden mx-auto">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.5 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="absolute animate-sparkle text-golden" style={{ top: `${30 + Math.random() * 40}%`, left: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.3}s` }}>✦</span>
                ))}
              </div>
            )}

            {receiptFlow === 'result' && (
              <div className="w-full max-w-sm text-center">
                {/* Torn paper receipt */}
                <div className="bg-card squircle p-6 shadow-golden relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-4" style={{ backgroundImage: 'repeating-conic-gradient(hsl(var(--card)) 0 25%, transparent 0 50%)', backgroundSize: '16px 8px', backgroundPosition: '0 -4px' }} />
                  <div className="pt-4">
                    <span className="text-4xl block mb-2">⭐</span>
                    <h3 className="font-heading text-xl text-foreground mb-2">Excellent!</h3>
                    <p className="font-body text-sm text-muted-foreground italic mb-4">
                      Amazing effort! You used three new phrases and your confidence is really showing. Next time try including a greeting!
                    </p>
                    <div className="bg-golden/20 inline-block px-4 py-1.5 rounded-full">
                      <span className="font-heading text-foreground">+{selectedNode.xp} XP</span>
                    </div>
                  </div>
                </div>

                <Companion size={80} mood="celebration" className="mx-auto my-4" />

                <div className="flex flex-col gap-3 mt-4">
                  <button onClick={() => { setReceiptFlow(null); setSelectedNode(null); setConfetti(true); }} className="bg-accent text-accent-foreground font-heading py-3 rounded-2xl press">Share to Badge Board</button>
                  <button onClick={() => { setReceiptFlow(null); setSelectedNode(null); setConfetti(true); }} className="bg-primary text-primary-foreground font-heading py-3 rounded-2xl press">Continue My Path →</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function buddyNameFromStorage() {
  return 'Mochi';
}

export default MyPath;
