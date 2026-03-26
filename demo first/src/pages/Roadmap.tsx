import React, { useState } from "react";
import Buddy from "../components/Buddy";

interface RoadmapNode {
  id: number;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  current: boolean;
  isReceipt: boolean;
  resources?: { title: string; type: "video" | "article"; time: string; buddyPick?: boolean }[];
}

const mockNodes: RoadmapNode[] = [
  {
    id: 1, title: "The Basics", description: "Learn greetings, the alphabet, and basic sounds.",
    xp: 80, completed: true, current: false, isReceipt: false,
    resources: [
      { title: "Spanish Alphabet in 10 Min", type: "video", time: "10 min" },
      { title: "Essential Greetings Guide", type: "article", time: "5 min", buddyPick: true },
    ],
  },
  {
    id: 2, title: "Your First Phrases", description: "Master 20 essential phrases for daily life.",
    xp: 100, completed: true, current: false, isReceipt: false,
    resources: [
      { title: "20 Must-Know Phrases", type: "video", time: "15 min", buddyPick: true },
      { title: "Practice Worksheet", type: "article", time: "10 min" },
    ],
  },
  {
    id: 3, title: "Numbers & Time", description: "Count, tell time, and talk about dates.",
    xp: 100, completed: true, current: false, isReceipt: false,
    resources: [
      { title: "Numbers 1-100 Song", type: "video", time: "8 min" },
      { title: "Telling Time in Spanish", type: "article", time: "7 min", buddyPick: true },
    ],
  },
  {
    id: 4, title: "Proof Time!", description: "Record yourself counting to 20 in Spanish!",
    xp: 250, completed: true, current: false, isReceipt: true,
  },
  {
    id: 5, title: "Order Food Like a Local", description: "Restaurant vocabulary and common food orders.",
    xp: 120, completed: false, current: true, isReceipt: false,
    resources: [
      { title: "Restaurant Spanish 101", type: "video", time: "12 min", buddyPick: true },
      { title: "Food Vocabulary List", type: "article", time: "8 min" },
      { title: "Menu Reading Practice", type: "article", time: "6 min" },
    ],
  },
  {
    id: 6, title: "Ask for Directions", description: "Navigate like a local with direction phrases.",
    xp: 120, completed: false, current: false, isReceipt: false,
    resources: [
      { title: "Direction Phrases Video", type: "video", time: "10 min" },
      { title: "Map Exercise", type: "article", time: "15 min", buddyPick: true },
    ],
  },
  {
    id: 7, title: "Talk About Yourself", description: "Introduce yourself, your hobbies, and interests.",
    xp: 130, completed: false, current: false, isReceipt: false,
    resources: [
      { title: "Self-Introduction Guide", type: "video", time: "14 min", buddyPick: true },
      { title: "Hobby Vocabulary", type: "article", time: "8 min" },
    ],
  },
  {
    id: 8, title: "Proof Time!", description: "Record a short video ordering food in Spanish!",
    xp: 300, completed: false, current: false, isReceipt: true,
  },
];

const encouragements = [
  "You're doing amazing! 🌟",
  "Keep going, superstar! ⭐",
  "I believe in you! 💪",
  "One step at a time! 🐾",
  "You've got this! 🎉",
];

const Roadmap: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [encouragement, setEncouragement] = useState("");
  const buddyName = localStorage.getItem("studybuddy-name") || "Buddy";
  const completedXP = mockNodes.filter((n) => n.completed).reduce((a, b) => a + b.xp, 0);
  const streak = 4;

  const showEncouragement = () => {
    setEncouragement(encouragements[Math.floor(Math.random() * encouragements.length)]);
    setTimeout(() => setEncouragement(""), 2500);
  };

  return (
    <div className="min-h-screen pb-24 relative">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border">
        <h1 className="font-display text-xl text-foreground flex items-center gap-2">
          <span className="inline-block w-6 h-6"><Buddy size={24} mood="happy" /></span>
          StudyBuddy
        </h1>
        <div className="flex items-center gap-4 font-body font-bold text-sm">
          <span>🔥 Day {streak}</span>
          <span>⭐ {completedXP} XP</span>
        </div>
      </div>

      {/* Roadmap path */}
      <div className="px-6 pt-6 max-w-[430px] mx-auto">
        <div className="relative">
          {mockNodes.map((node, i) => {
            const isLeft = i % 2 === 0;
            return (
              <div key={node.id} className="relative mb-4">
                {/* Connector line */}
                {i > 0 && (
                  <div
                    className="absolute top-0 w-0.5 h-6 bg-muted"
                    style={{ left: "50%", transform: "translate(-50%, -24px)" }}
                  />
                )}
                <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
                  <button
                    onClick={() => node.isReceipt ? null : setSelectedNode(node)}
                    className={`relative flex items-center gap-3 px-5 py-4 rounded-squircle-lg press-scale transition-all ${
                      node.isReceipt
                        ? "bg-golden/30 card-shadow-golden border-2 border-golden/50"
                        : node.completed
                        ? "bg-mint/30 card-shadow-mint"
                        : node.current
                        ? "bg-sky/30 card-shadow-sky ring-2 ring-sky"
                        : "bg-muted/60"
                    }`}
                    style={{ maxWidth: "75%" }}
                  >
                    {node.current && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        <Buddy size={32} mood="happy" />
                      </div>
                    )}
                    <span className="text-xl">
                      {node.isReceipt ? "📸" : node.completed ? "✅" : node.current ? "🔵" : "⬜"}
                    </span>
                    <span className={`font-display text-sm ${
                      node.completed || node.current ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {node.title}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating buddy */}
      <button
        onClick={showEncouragement}
        className="fixed bottom-20 right-4 z-30 press-scale"
      >
        <Buddy size={50} mood="idle" />
      </button>

      {/* Encouragement bubble */}
      {encouragement && (
        <div className="fixed bottom-36 right-4 z-40 bg-card rounded-squircle px-4 py-2 card-shadow-mint animate-bounce-in font-body text-sm text-foreground max-w-[180px]">
          {encouragement}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      {selectedNode && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 flex items-end justify-center"
          onClick={() => setSelectedNode(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] bg-background rounded-t-[2rem] p-6 animate-slide-up"
          >
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
            <h2 className="font-display text-xl text-foreground mb-1">{selectedNode.title}</h2>
            <p className="font-body text-muted-foreground text-sm mb-4">{selectedNode.description}</p>

            {selectedNode.resources && (
              <div className="flex gap-3 overflow-x-auto pb-3 mb-4">
                {selectedNode.resources.map((res, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-48 bg-card rounded-squircle p-4 border border-border relative"
                  >
                    {res.buddyPick && (
                      <span className="absolute -top-2 -right-2 bg-golden px-2 py-0.5 rounded-full text-xs font-body font-bold">
                        ⭐ {buddyName}'s Pick
                      </span>
                    )}
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mb-2 ${
                        res.type === "video" ? "bg-destructive/20 text-destructive" : "bg-sky/40 text-accent-foreground"
                      }`}
                    >
                      {res.type === "video" ? "▶ Video" : "📄 Article"}
                    </span>
                    <p className="font-body text-sm font-semibold text-foreground">{res.title}</p>
                    <p className="font-body text-xs text-muted-foreground mt-1">{res.time}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="bg-golden/30 px-3 py-1 rounded-full font-body font-bold text-sm">
                +{selectedNode.xp} XP
              </span>
              <button className="px-6 py-3 rounded-squircle bg-mint font-display text-primary-foreground press-scale">
                Mark Complete ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmap;
