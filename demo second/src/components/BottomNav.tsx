import React from 'react';
import { Map, Home, Award } from 'lucide-react';

interface BottomNavProps {
  active: 'path' | 'home' | 'badges';
  onNavigate: (tab: 'path' | 'home' | 'badges') => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ active, onNavigate }) => {
  const tabs = [
    { key: 'path' as const, icon: Map, label: 'My Path' },
    { key: 'home' as const, icon: Home, label: 'Home' },
    { key: 'badges' as const, icon: Award, label: 'Badges' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream border-t border-border z-50">
      <div className="flex justify-around items-center h-16 px-4">
        {tabs.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`flex flex-col items-center gap-1 press p-2 rounded-2xl transition-colors ${
              active === key ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon size={active === key ? 28 : 24} strokeWidth={active === key ? 2.5 : 2} />
            {active === key && (
              <div className="w-6 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
