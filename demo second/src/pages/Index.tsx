import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Onboarding from './Onboarding';
import GoalTuning from './GoalTuning';
import HomeScreen from './HomeScreen';
import MyPath from './MyPath';
import BadgeBoard from './BadgeBoard';
import BuddyCustomization from './BuddyCustomization';
import SettingsScreen from './SettingsScreen';
import BottomNav from '../components/BottomNav';

type Screen = 'onboarding' | 'goalTuning' | 'home' | 'path' | 'badges' | 'customization' | 'settings';

const Index: React.FC = () => {
  // Skip onboarding for demo — start at home with pre-filled data
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [goal, setGoal] = useState('I want to speak Spanish');
  const [buddyName, setBuddyName] = useState('Mochi');
  const [activeTab, setActiveTab] = useState<'path' | 'home' | 'badges'>('home');

  const showNav = ['home', 'path', 'badges'].includes(screen);

  const handleOnboardingComplete = (g: string, name: string) => {
    setGoal(g);
    setBuddyName(name);
    setScreen('goalTuning');
  };

  const handleGoalTuningComplete = () => {
    setScreen('home');
    setActiveTab('home');
  };

  const handleTabNavigate = (tab: 'path' | 'home' | 'badges') => {
    setActiveTab(tab);
    setScreen(tab === 'path' ? 'path' : tab === 'badges' ? 'badges' : 'home');
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-background relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen"
        >
          {screen === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
          {screen === 'goalTuning' && <GoalTuning goal={goal} buddyName={buddyName} onComplete={handleGoalTuningComplete} />}
          {screen === 'home' && (
            <HomeScreen
              buddyName={buddyName}
              onOpenCustomization={() => setScreen('customization')}
              onOpenSettings={() => setScreen('settings')}
            />
          )}
          {screen === 'path' && <MyPath />}
          {screen === 'badges' && <BadgeBoard />}
          {screen === 'customization' && <BuddyCustomization onBack={() => setScreen('home')} />}
          {screen === 'settings' && (
            <SettingsScreen
              onBack={() => setScreen('home')}
              onLogout={() => setScreen('onboarding')}
              email="demo@studbud.app"
              displayName={buddyName}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {showNav && (
        <BottomNav active={activeTab} onNavigate={handleTabNavigate} />
      )}
    </div>
  );
};

export default Index;
