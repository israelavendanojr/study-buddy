export interface RoadmapNode {
  id: string;
  title: string;
  type: 'skill' | 'receipt';
  status: 'completed' | 'current' | 'upcoming' | 'locked';
  xp: number;
  description?: string;
  receiptChallenge?: string;
  resources?: Resource[];
}

export interface Resource {
  type: 'video' | 'article';
  title: string;
  time: string;
  buddyPick?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  nodes: RoadmapNode[];
}

export interface Friend {
  id: string;
  name: string;
  buddyName: string;
  buddyColor: string;
  level: number;
  goal: string;
  domain: string;
  chapterProgress: string;
  streak: number;
  activeToday: boolean;
  lastReceipt?: {
    tag: string;
    media: string;
    feedback: string;
    result: 'pass' | 'excellent';
  };
}

export const roadmap: Chapter[] = [
  {
    id: 'ch1',
    title: 'Chapter 1: Foundations',
    nodes: [
      { id: 'n1', title: 'Greetings & Introductions', type: 'skill', status: 'completed', xp: 100, description: 'Learn the basics of saying hello and introducing yourself in Spanish.', resources: [
        { type: 'video', title: 'Spanish Greetings 101', time: '8 min', buddyPick: true },
        { type: 'article', title: 'Common Spanish Phrases', time: '5 min' },
      ]},
      { id: 'n2', title: 'Numbers & Counting', type: 'skill', status: 'completed', xp: 100, description: 'Master numbers 1-100 and basic counting patterns.', resources: [
        { type: 'video', title: 'Count to 100 in Spanish', time: '12 min' },
        { type: 'article', title: 'Number Patterns Guide', time: '7 min', buddyPick: true },
      ]},
      { id: 'n3', title: 'Basic Sentence Structure', type: 'skill', status: 'completed', xp: 120, description: 'Build your first simple sentences with subject-verb-object.', resources: [
        { type: 'video', title: 'Your First Spanish Sentences', time: '10 min' },
        { type: 'article', title: 'SVO in Spanish', time: '6 min' },
      ]},
      { id: 'n4', title: 'Colors, Days & Months', type: 'skill', status: 'completed', xp: 100, description: 'Learn essential vocabulary for colors, days of the week, and months.', resources: [
        { type: 'video', title: 'Colors & Calendar', time: '9 min', buddyPick: true },
      ]},
      { id: 'n5', title: 'Core Vocab: Food & Home', type: 'skill', status: 'completed', xp: 110, description: 'Build your core vocabulary around food and household items.', resources: [
        { type: 'article', title: 'Kitchen Spanish', time: '8 min' },
        { type: 'video', title: 'Food Vocabulary', time: '11 min' },
      ]},
      { id: 'r1', title: 'Introduce yourself on video', type: 'receipt', status: 'completed', xp: 250, receiptChallenge: 'Record a short video of yourself introducing yourself in Spanish — even 30 seconds is perfect!' },
    ],
  },
  {
    id: 'ch2',
    title: 'Chapter 2: Getting Around',
    nodes: [
      { id: 'n6', title: 'Directions & Places', type: 'skill', status: 'completed', xp: 120, description: 'Navigate your way around town with direction vocabulary.', resources: [
        { type: 'video', title: 'Finding Your Way', time: '10 min', buddyPick: true },
        { type: 'article', title: 'Direction Words', time: '5 min' },
      ]},
      { id: 'n7', title: 'Transport & Travel Vocab', type: 'skill', status: 'current', xp: 120, description: 'Learn vocabulary for buses, trains, taxis, and travel situations.', resources: [
        { type: 'video', title: 'Travel Spanish Essentials', time: '14 min' },
        { type: 'article', title: 'At the Train Station', time: '8 min', buddyPick: true },
      ]},
      { id: 'n8', title: 'Asking for Help', type: 'skill', status: 'upcoming', xp: 130, description: 'Essential phrases for when you need assistance.', resources: [
        { type: 'video', title: 'Help! In Spanish', time: '7 min' },
      ]},
      { id: 'n9', title: 'Time & Scheduling', type: 'skill', status: 'upcoming', xp: 120, description: 'Tell time and make plans with scheduling vocabulary.', resources: [
        { type: 'article', title: 'Telling Time', time: '6 min' },
      ]},
      { id: 'n10', title: 'Shopping Phrases', type: 'skill', status: 'upcoming', xp: 120, description: 'Essential phrases for shopping and bargaining.', resources: [
        { type: 'video', title: 'Shopping in Spanish', time: '11 min' },
      ]},
      { id: 'r2', title: 'Ask for directions in a voice memo', type: 'receipt', status: 'locked', xp: 250, receiptChallenge: 'Record a voice memo asking for directions to a nearby landmark in Spanish!' },
    ],
  },
  {
    id: 'ch3',
    title: 'Chapter 3: Real Conversations',
    nodes: [
      { id: 'n11', title: 'Ordering Food & Drinks', type: 'skill', status: 'upcoming', xp: 130, description: 'Order at restaurants and cafés with confidence.', resources: [] },
      { id: 'n12', title: 'Making Plans with Friends', type: 'skill', status: 'upcoming', xp: 130, description: 'Invite friends and make plans in Spanish.', resources: [] },
      { id: 'n13', title: 'Talking About Your Life', type: 'skill', status: 'upcoming', xp: 140, description: 'Share stories about your daily life and interests.', resources: [] },
      { id: 'n14', title: 'Opinions & Feelings', type: 'skill', status: 'upcoming', xp: 140, description: 'Express how you feel and share your opinions.', resources: [] },
      { id: 'n15', title: 'Phone & Messaging Phrases', type: 'skill', status: 'upcoming', xp: 120, description: 'Communicate naturally through texts and phone calls.', resources: [] },
      { id: 'r3', title: 'Record a 1-min conversation about your week', type: 'receipt', status: 'locked', xp: 300, receiptChallenge: 'Record a 1-minute conversation about your week in Spanish — talk about what you did and your plans!' },
    ],
  },
  {
    id: 'ch4',
    title: 'Chapter 4: Fluency Stretch',
    nodes: [
      { id: 'n16', title: 'Past Tense Storytelling', type: 'skill', status: 'upcoming', xp: 150, description: 'Tell stories about past events using correct tenses.', resources: [] },
      { id: 'n17', title: 'Future Plans & Dreams', type: 'skill', status: 'upcoming', xp: 150, description: 'Talk about your future goals and aspirations.', resources: [] },
      { id: 'n18', title: 'Debate & Persuasion Basics', type: 'skill', status: 'upcoming', xp: 160, description: 'Build arguments and persuade others in Spanish.', resources: [] },
      { id: 'n19', title: 'Cultural Phrases & Humour', type: 'skill', status: 'upcoming', xp: 140, description: 'Learn idioms, cultural references, and humor.', resources: [] },
      { id: 'n20', title: 'Freestyle Expression', type: 'skill', status: 'upcoming', xp: 150, description: 'Express yourself freely and creatively in Spanish.', resources: [] },
      { id: 'r4', title: 'Tell a 2-min story in Spanish', type: 'receipt', status: 'locked', xp: 500, receiptChallenge: 'Record a 2-minute story in Spanish about anything you want — this is your moment to shine!' },
    ],
  },
];

export const friends: Friend[] = [
  {
    id: 'f1', name: 'Maya', buddyName: 'Bloop', buddyColor: '#D4BBFF', level: 6, goal: 'Learn Piano', domain: 'Piano', chapterProgress: 'Chapter 3 of 4', streak: 12, activeToday: true,
    lastReceipt: { tag: 'Piano · Chapter 2 Receipt', media: 'piano_practice.jpg', feedback: 'Beautiful chord transitions! Keep practicing those arpeggios.', result: 'excellent' },
  },
  {
    id: 'f2', name: 'Alex', buddyName: 'Zippy', buddyColor: '#B8D8F8', level: 3, goal: 'Run a 5K', domain: 'Running', chapterProgress: 'Chapter 2 of 3', streak: 5, activeToday: true,
    lastReceipt: { tag: 'Running · Chapter 1 Receipt', media: 'running_screenshot.jpg', feedback: 'Great pace consistency! Your form is improving each week.', result: 'pass' },
  },
  {
    id: 'f3', name: 'Jordan', buddyName: 'Nubs', buddyColor: '#A8E6C3', level: 8, goal: 'Master Chess', domain: 'Chess', chapterProgress: 'Chapter 4 of 5', streak: 21, activeToday: false,
    lastReceipt: { tag: 'Chess · Chapter 3 Receipt', media: 'chess_game.jpg', feedback: 'Excellent opening strategy! Your mid-game tactics are getting really sharp.', result: 'excellent' },
  },
  {
    id: 'f4', name: 'Sam', buddyName: 'Muffin', buddyColor: '#FFCBA4', level: 5, goal: 'Cook Italian Food', domain: 'Cooking', chapterProgress: 'Chapter 2 of 4', streak: 8, activeToday: true,
    lastReceipt: { tag: 'Cooking · Chapter 2 Receipt', media: 'pasta_dish.jpg', feedback: 'That pasta looks restaurant-quality! The sauce consistency is perfect.', result: 'excellent' },
  },
  {
    id: 'f5', name: 'Riley', buddyName: 'Pixel', buddyColor: '#FFE082', level: 2, goal: 'Learn Guitar', domain: 'Guitar', chapterProgress: 'Chapter 1 of 4', streak: 3, activeToday: false,
    lastReceipt: { tag: 'Guitar · Chapter 1 Receipt', media: 'guitar_practice.jpg', feedback: 'Solid strumming pattern! Try to keep your wrist a bit more relaxed.', result: 'pass' },
  },
];

export const companionColors = [
  { name: 'Mint', color: '#A8E6C3', unlocked: true },
  { name: 'Lavender', color: '#D4BBFF', unlocked: true },
  { name: 'Peach', color: '#FFCBA4', unlocked: true },
  { name: 'Sky Blue', color: '#B8D8F8', unlocked: false, cost: '800 XP' },
  { name: 'Midnight Blue', color: '#5B7DB1', unlocked: false, cost: '1200 XP' },
  { name: 'Blossom Pink', color: '#FFB5C5', unlocked: false, cost: '🪙 $1.99' },
  { name: 'Sunflower Yellow', color: '#FFE082', unlocked: false, cost: '1500 XP' },
  { name: 'Slate Grey', color: '#A0AEC0', unlocked: false, pro: true },
];

export const accessories = [
  { name: 'Round Glasses', unlocked: true, equipped: true },
  { name: 'Tiny Party Hat', unlocked: true, equipped: false },
  { name: 'Cozy Scarf', unlocked: false, cost: '600 XP' },
  { name: 'Mini Backpack', unlocked: false, cost: '900 XP' },
  { name: 'Flower Crown', unlocked: false, cost: '1000 XP' },
  { name: 'Chef Hat', unlocked: false, cost: '🪙 $0.99' },
  { name: 'Graduation Cap', unlocked: false, cost: '2000 XP' },
  { name: 'Space Helmet', unlocked: false, pro: true },
  { name: 'Pirate Bandana', unlocked: false, cost: '1200 XP' },
  { name: 'Winter Earmuffs', unlocked: false, cost: '800 XP' },
  { name: 'Cape', unlocked: false, pro: true },
  { name: 'Bow Tie', unlocked: false, cost: '500 XP' },
];

export const rooms = [
  { name: 'Spanish Courtyard', unlocked: true, equipped: true, colors: ['#E8D5B7', '#C9956B', '#6B8E4E'] },
  { name: 'Chess Library', unlocked: true, equipped: false, colors: ['#5B4A3F', '#8B7355', '#2F4F2F'] },
  { name: 'Kitchen Studio', unlocked: false, cost: '1500 XP', colors: ['#F5F5F5', '#E8E8E8', '#FFB74D'] },
  { name: 'City Rooftop', unlocked: false, cost: '2000 XP', colors: ['#2C3E50', '#E74C3C', '#F39C12'] },
  { name: 'Enchanted Forest', unlocked: false, cost: '🪙 $2.99', colors: ['#1B5E20', '#4CAF50', '#8BC34A'] },
  { name: 'Space Station', unlocked: false, pro: true, colors: ['#1A1A2E', '#16213E', '#533483'] },
  { name: 'Cozy Cabin', unlocked: false, cost: '1800 XP', colors: ['#8D6E63', '#D7CCC8', '#FF8A65'] },
  { name: 'Cherry Blossom Garden', unlocked: false, pro: true, colors: ['#FCE4EC', '#F8BBD0', '#4CAF50'] },
];
