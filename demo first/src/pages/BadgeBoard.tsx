import React from "react";
import Buddy from "../components/Buddy";

interface FeedItem {
  id: number;
  name: string;
  avatar: string;
  buddyName: string;
  level: number;
  tag: string;
  feedback: string;
  buddyMood: "happy" | "excited" | "celebrate";
}

interface ActiveFriend {
  id: number;
  name: string;
  buddyName: string;
  active: boolean;
  goal: string;
  progress: number;
}

const activeFriends: ActiveFriend[] = [
  { id: 1, name: "Maya", buddyName: "Sprout", active: true, goal: "Learn Piano", progress: 65 },
  { id: 2, name: "Alex", buddyName: "Bloom", active: true, goal: "Run a 5K", progress: 40 },
  { id: 3, name: "Sam", buddyName: "Pebble", active: false, goal: "Cook Italian", progress: 80 },
  { id: 4, name: "Jordan", buddyName: "Fizz", active: true, goal: "Learn Chess", progress: 25 },
];

const feedItems: FeedItem[] = [
  {
    id: 1, name: "Maya", avatar: "🧑‍🎤", buddyName: "Sprout", level: 5,
    tag: "Piano · Week 4 Receipt", feedback: "Beautiful chord transitions! Keep practicing those arpeggios.",
    buddyMood: "celebrate",
  },
  {
    id: 2, name: "Alex", avatar: "🏃", buddyName: "Bloom", level: 3,
    tag: "Running · Week 2 Receipt", feedback: "Great pace improvement! Your form is getting really consistent.",
    buddyMood: "happy",
  },
  {
    id: 3, name: "Sam", avatar: "👨‍🍳", buddyName: "Pebble", level: 7,
    tag: "Cooking · Week 6 Receipt", feedback: "Showed strong grasp of pasta techniques! The carbonara looked incredible.",
    buddyMood: "excited",
  },
];

const BadgeBoard: React.FC = () => {
  const [selectedFriend, setSelectedFriend] = React.useState<ActiveFriend | null>(null);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="font-display text-3xl text-foreground">Badge Board 🏅</h1>
      </div>

      {/* Active Friends row */}
      <div className="px-6 mb-6">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {activeFriends.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFriend(selectedFriend?.id === f.id ? null : f)}
              className="flex flex-col items-center gap-1 flex-shrink-0 press-scale"
            >
              <div className={`relative rounded-full p-1 ${f.active ? "ring-2 ring-mint" : "ring-2 ring-muted"}`}>
                <Buddy size={40} mood={f.active ? "happy" : "idle"} />
              </div>
              <span className="font-body text-xs font-semibold text-foreground">{f.buddyName}</span>
            </button>
          ))}
        </div>

        {/* Mini profile */}
        {selectedFriend && (
          <div className="bg-card rounded-squircle-lg p-4 card-shadow-lavender animate-slide-up mt-3">
            <div className="flex items-center gap-3 mb-3">
              <Buddy size={36} mood="happy" />
              <div>
                <p className="font-display text-sm">{selectedFriend.name}'s {selectedFriend.buddyName}</p>
                <p className="font-body text-xs text-muted-foreground">{selectedFriend.goal}</p>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-mint rounded-full transition-all"
                style={{ width: `${selectedFriend.progress}%` }}
              />
            </div>
            <p className="font-body text-xs text-muted-foreground mt-1">{selectedFriend.progress}% complete</p>
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="px-6 flex flex-col gap-4">
        {feedItems.map((item) => (
          <div key={item.id} className="bg-card rounded-squircle-lg p-5 card-shadow-peach">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{item.avatar}</span>
              <div>
                <p className="font-display text-sm text-foreground">{item.name}</p>
                <p className="font-body text-xs text-muted-foreground">
                  {item.buddyName} · Lv.{item.level}
                </p>
              </div>
              <div className="ml-auto">
                <Buddy size={30} mood={item.buddyMood} />
              </div>
            </div>

            <span className="inline-block bg-lavender/30 px-3 py-1 rounded-full font-body text-xs font-semibold text-foreground mb-3">
              {item.tag}
            </span>

            <div className="bg-muted/50 rounded-squircle p-3 mb-3">
              <div className="w-full h-20 bg-muted rounded-lg flex items-center justify-center text-2xl">
                📸
              </div>
            </div>

            <p className="font-body text-sm italic text-muted-foreground mb-3">
              "{item.feedback}"
            </p>

            <div className="flex gap-2">
              {["🔥 Hype", "💪 Inspire", "🌟 Shine"].map((reaction) => (
                <button
                  key={reaction}
                  className="px-3 py-1.5 rounded-full bg-muted font-body text-xs font-semibold press-scale hover:bg-mint/20 transition-colors"
                >
                  {reaction}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeBoard;
