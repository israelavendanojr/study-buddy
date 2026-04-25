export const colors = {
  background: '#F9F7F2',       // Warm Off-White canvas
  surface: '#fef9ea',           // Card fill
  surfaceContainer: '#f2eedf',  // Nested card / inner section
  ink: '#1A1A1A',               // All text, borders, icons
  inkSoft: '#4a4a4a',           // Secondary text
  amber: '#B35C1E',             // Primary actions, selected, XP
  amberLight: '#E8A87C',        // Amber tint for star fills
  amberDark: '#984806',         // Pressed amber
  paperShadow: '#E6E2D3',       // Block shadow color
  success: '#2D6A2D',           // Correct answer
  successLight: '#EBF5EB',      // Correct answer bg
  error: '#ba1a1a',             // Error states
  errorLight: '#FDECEA',        // Error bg
  white: '#FFFFFF',
  locked: 'rgba(26,26,26,0.35)',
} as const

export const typography = {
  headline: 'Newsreader_400Regular',
  headlineItalic: 'Newsreader_400Regular_Italic',
  headlineBold: 'Newsreader_700Bold',
  body: 'BeVietnamPro_400Regular',
  bodySemiBold: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
  label: 'SpaceGrotesk_400Regular',
  labelMedium: 'SpaceGrotesk_500Medium',
  labelBold: 'SpaceGrotesk_700Bold',
} as const

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const

// Canonical block shadow — 4px offset in ink or paper
export const blockShadow = {
  ink: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  paper: {
    shadowColor: '#E6E2D3',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  amber: {
    shadowColor: '#B35C1E',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

// Grid dot size + repeat (20×20px visual grid)
export const GRID_SIZE = 20
