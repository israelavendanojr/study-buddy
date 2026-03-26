import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center px-4 pt-4 pb-2">
        <button onClick={onBack} className="p-2 rounded-2xl bg-card press"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-heading text-foreground ml-3">Settings</h1>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Profile */}
        <div className="bg-card squircle p-4 shadow-mint">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <span className="font-heading text-primary-foreground text-xl">S</span>
            </div>
            <div>
              <p className="font-heading text-lg text-foreground">StudBud User</p>
              <button className="text-xs text-primary font-body underline">Edit Profile</button>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="font-heading text-foreground">530</p><p className="text-xs text-muted-foreground font-body">Total XP</p></div>
            <div><p className="font-heading text-foreground">1</p><p className="text-xs text-muted-foreground font-body">Receipts</p></div>
            <div><p className="font-heading text-foreground">7</p><p className="text-xs text-muted-foreground font-body">Day Streak</p></div>
          </div>
        </div>

        {/* My Goal */}
        <div className="bg-card squircle p-4 shadow-peach">
          <h3 className="font-heading text-base text-foreground mb-2">My Goal</h3>
          <p className="font-body text-sm text-foreground mb-1">Spanish · Week 3 of 8 · Chapter 2 of 4</p>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
            <div className="h-full rounded-full bg-secondary" style={{ width: '35%' }} />
          </div>
          <div className="flex gap-3">
            <button className="text-xs text-primary font-body underline">Retune Goal</button>
            <button className="text-xs text-primary font-body underline">New Goal</button>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <h4 className="font-heading text-sm text-foreground mb-2">Past Journeys</h4>
            <p className="text-xs text-muted-foreground font-body italic">No past journeys yet — keep going!</p>
          </div>
        </div>

        {/* Friends */}
        <div className="bg-card squircle p-4 shadow-sky">
          <h3 className="font-heading text-base text-foreground mb-3">Friends</h3>
          <button className="w-full bg-primary/10 text-primary font-heading text-sm py-3 rounded-2xl press mb-3">+ Add Friends</button>
          {['Maya · Piano', 'Alex · Running', 'Jordan · Chess', 'Sam · Cooking'].map(f => (
            <div key={f} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <span className="font-body text-sm text-foreground">{f}</span>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="bg-card squircle p-4">
          <h3 className="font-heading text-base text-foreground mb-3">Notifications</h3>
          {['Daily Buddy Check-in', 'Receipt Reminders', 'Friend Activity'].map(n => (
            <div key={n} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="font-body text-sm text-foreground">{n}</span>
              <div className="w-10 h-6 rounded-full bg-primary relative press cursor-pointer">
                <div className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background" />
              </div>
            </div>
          ))}
        </div>

        {/* Plan */}
        <div className="bg-secondary/20 squircle p-4">
          <h3 className="font-heading text-base text-foreground mb-2">Your Plan: Free</h3>
          <p className="text-xs text-muted-foreground font-body mb-3">Your current path and buddy are always yours — upgrade to create unlimited goals.</p>
          <div className="bg-secondary/40 squircle p-4">
            <p className="font-heading text-sm text-foreground mb-2">StudBud Pro</p>
            <ul className="text-xs font-body text-foreground space-y-1 mb-3">
              <li>• Unlimited roadmaps</li>
              <li>• All cosmetics unlocked</li>
              <li>• Early drops & exclusives</li>
            </ul>
            <button className="w-full bg-secondary text-secondary-foreground font-heading text-sm py-3 rounded-2xl press">Upgrade to Pro →</button>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-col items-center gap-2 pt-4 pb-8">
          <button className="text-xs text-muted-foreground font-body">About</button>
          <button className="text-xs text-muted-foreground font-body">Help</button>
          <button className="text-xs text-muted-foreground font-body">Log out</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
